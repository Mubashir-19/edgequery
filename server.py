import asyncio
import websockets
import nest_asyncio
import gc
import json
import re
import time
import statistics
from collections import defaultdict
from llama_cpp import Llama
import asyncpg
import os
from typing import Optional, Dict, Any
import socket
import logging

# Apply nest_asyncio to allow nested event loops (useful in notebooks)
nest_asyncio.apply()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance and activity tracker
llm = None
last_activity = None

# User context storage - maps user_id to last 5 messages
user_contexts = defaultdict(lambda: [])
MAX_CONTEXT_MESSAGES = 5

# Global variables for stopping LLM generation
stop_generation = defaultdict(bool)
active_generations = defaultdict(bool)

# Token generation timing metrics
token_generation_metrics = {
    "total_tokens": 0,
    "total_time": 0.0,
    "session_times": [],
    "last_session_tokens": 0,
    "last_session_time": 0.0,
    "last_session_avg_time_per_token": 0.0
}

# Configuration
device = "cpu"
model_repo = "devMubashir/text-to-sql-reasoning-llama3.2-3b"
model_file = "unsloth.Q8_0.gguf"

# Idle timeout (seconds)
IDLE_TIMEOUT = 600
# PostgreSQL connection string - now from environment variable
POSTGRES_CONNECTION_STRING = os.getenv(
    'POSTGRES_CONNECTION_STRING'
)

class DatabaseManager:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.pool: Optional[asyncpg.Pool] = None

    def parse_connection_string(self, conn_str: str) -> dict:
        """Parse PostgreSQL connection string into components"""
        import urllib.parse
        
        # Handle both postgresql:// and postgres:// schemes
        if conn_str.startswith('postgresql://'):
            parsed = urllib.parse.urlparse(conn_str)
        elif conn_str.startswith('postgres://'):
            parsed = urllib.parse.urlparse(conn_str)
        else:
            raise ValueError("Invalid connection string format")
        print ({
            'user': parsed.username,
            'password': parsed.password,
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/') if parsed.path else 'postgres',
            'query': dict(urllib.parse.parse_qsl(parsed.query)) if parsed.query else {}
        })
        return {
            'user': parsed.username,
            'password': parsed.password,
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/') if parsed.path else 'postgres',
            'query': dict(urllib.parse.parse_qsl(parsed.query)) if parsed.query else {}
        }

    async def resolve_to_ipv4(self, hostname: str) -> Optional[str]:
        """Resolve hostname to IPv4 address only"""
        try:
            # Force IPv4 resolution
            addresses = await asyncio.get_event_loop().getaddrinfo(
                hostname, 
                None, 
                family=socket.AF_INET,  # Force IPv4
                type=socket.SOCK_STREAM
            )
            if addresses:
                return addresses[0][4][0]
        except Exception as e:
            logger.warning(f"Failed to resolve {hostname} to IPv4: {e}")
        return None

    def build_connection_string(self, components: dict, force_ipv4: bool = False, 
                              ssl_mode: str = None, connect_timeout: int = None) -> str:
        """Build connection string from components"""
        host = components['host']
        
        # Build the connection string
        conn_str = f"postgresql://{components['user']}:{components['password']}@{host}:{components['port']}/{components['database']}"
        
        # Add query parameters
        params = components['query'].copy()
        if ssl_mode:
            params['sslmode'] = ssl_mode
        if connect_timeout:
            params['connect_timeout'] = str(connect_timeout)
        
        if params:
            param_str = '&'.join([f"{k}={v}" for k, v in params.items()])
            conn_str += f"?{param_str}"
        
        return conn_str

    async def get_connection_strategies(self) -> list:
        """Generate multiple connection strategies to try"""
        components = self.parse_connection_string(self.connection_string)
        strategies = []
        
        # Strategy 1: Force IPv4 resolution with SSL require
        ipv4_host = await self.resolve_to_ipv4(components['host'])
        if ipv4_host:
            ipv4_components = components.copy()
            ipv4_components['host'] = ipv4_host
            strategies.append({
                'name': 'IPv4 with SSL required',
                'conn_str': self.build_connection_string(ipv4_components, ssl_mode='require', connect_timeout=30)
            })
            strategies.append({
                'name': 'IPv4 with SSL preferred', 
                'conn_str': self.build_connection_string(ipv4_components, ssl_mode='prefer', connect_timeout=30)
            })
            strategies.append({
                'name': 'IPv4 with SSL disabled',
                'conn_str': self.build_connection_string(ipv4_components, ssl_mode='disable', connect_timeout=30)
            })
        
        # Strategy 2: Original hostname with different SSL modes
        strategies.extend([
            {
                'name': 'Original hostname with SSL required',
                'conn_str': self.build_connection_string(components, ssl_mode='require', connect_timeout=30)
            },
            {
                'name': 'Original hostname with SSL preferred',
                'conn_str': self.build_connection_string(components, ssl_mode='prefer', connect_timeout=30)
            },
            {
                'name': 'Original hostname with SSL disabled',
                'conn_str': self.build_connection_string(components, ssl_mode='disable', connect_timeout=30)
            },
            {
                'name': 'Original connection string',
                'conn_str': self.connection_string
            }
        ])
        
        return strategies

    async def initialize_pool(self):
        """Initialize database connection pool with multiple strategies"""
        strategies = await self.get_connection_strategies()
        
        for i, strategy in enumerate(strategies, 1):
            try:
                logger.info(f"Attempting database connection (strategy {i}: {strategy['name']})...")
                
                # Create pool with better configuration
                self.pool = await asyncpg.create_pool(
                    strategy['conn_str'],
                    min_size=1,
                    max_size=5,  # Reduce pool size for stability  
                    command_timeout=30,
                    server_settings={
                        'application_name': 'llama_websocket_server',
                        'timezone': 'UTC'
                    },
                    init=self._init_connection
                )
                
                # Test the connection
                if await self.test_connection():
                    logger.info(f"Database connection established successfully using strategy {i}")
                    return
                else:
                    logger.warning(f"Strategy {i} created pool but connection test failed")
                    await self.pool.close()
                    self.pool = None
                    
            except Exception as e:
                logger.warning(f"Strategy {i} failed: {e}")
                if self.pool:
                    try:
                        await self.pool.close()
                    except:
                        pass
                    self.pool = None
                continue

        raise Exception("All connection strategies failed")

    async def _init_connection(self, connection):
        """Initialize individual connections in the pool"""
        try:
            # Set connection parameters if needed
            await connection.execute("SET timezone = 'UTC'")
        except Exception as e:
            logger.warning(f"Failed to initialize connection: {e}")

    async def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute a database query"""
        if not self.pool:
            return {
                "success": False,
                "error": "❌ Database connection not available. Please check your PostgreSQL connection string environment variable.",
                "data": None
            }

        try:
            async with self.pool.acquire() as connection:
                query = query.strip()
                
                # Handle SELECT queries
                if query.upper().startswith(('SELECT', 'WITH')):
                    rows = await connection.fetch(query)
                    result_data = [dict(row) for row in rows]
                    return {
                        "success": True,
                        "data": result_data,
                        "row_count": len(result_data),
                        "error": None
                    }
                # Handle modification queries  
                else:
                    result = await connection.execute(query)
                    return {
                        "success": True,
                        "data": None,
                        "affected_rows": result.split()[-1] if result else "0",
                        "error": None
                    }
                    
        except asyncpg.PostgresError as e:
            logger.error(f"PostgreSQL error: {e}")
            error_message = f"Database Error: {str(e)}"
            
            # Provide more user-friendly error messages
            if "relation does not exist" in str(e).lower():
                error_message = "❌ Table or view not found. Please check if the table exists in your database."
            elif "column does not exist" in str(e).lower():
                error_message = "❌ Column not found. Please check if the column name is correct."
            elif "syntax error" in str(e).lower():
                error_message = "❌ SQL syntax error. Please check your query syntax."
            elif "permission denied" in str(e).lower():
                error_message = "❌ Permission denied. Check if you have the necessary database permissions."
            
            return {
                "success": False,
                "error": error_message,
                "data": None
            }
        except Exception as e:
            logger.error(f"Database query error: {e}")
            return {
                "success": False,
                "error": f"❌ Database connection error: {str(e)}. Please verify your PostgreSQL connection string.",
                "data": None
            }

    async def test_connection(self) -> bool:
        """Test database connection"""
        try:
            if not self.pool:
                return False
                
            async with asyncio.timeout(10):  # 10 second timeout
                async with self.pool.acquire() as connection:
                    result = await connection.fetchval("SELECT 1")
                    return result == 1
                    
        except asyncio.TimeoutError:
            logger.error("Database connection test timed out")
            return False
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False

    async def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status"""
        if not self.pool:
            return {"status": "not_initialized"}
        
        return {
            "status": "initialized",
            "size": self.pool.get_size(),
            "min_size": self.pool.get_min_size(),
            "max_size": self.pool.get_max_size(),
            "idle_size": self.pool.get_idle_size()
        }

    async def close_pool(self):
        """Close the database connection pool"""
        if self.pool:
            try:
                await self.pool.close()
                logger.info("Database connection pool closed")
            except Exception as e:
                logger.error(f"Error closing database pool: {e}")
            finally:
                self.pool = None

# Initialize database manager
db_manager = DatabaseManager(POSTGRES_CONNECTION_STRING)

def extract_sql_from_response(response: str) -> Optional[str]:
    """Extract SQL query from LLM response"""
    # Try different patterns to extract SQL
    patterns = [
        r'<final_sql_query_start>(.*?)<final_sql_query_end>',
        r'```sql\n(.*?)\n```',
        r'```\n((?:SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP).*?)\n```',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    # Fallback: look for SQL keywords at line start
    lines = response.split('\n')
    for line in lines:
        line = line.strip()
        if line and line.upper().startswith(('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH', 'CREATE', 'ALTER', 'DROP')):
            return line

    return None

async def load_model():
    """Load the LLM model"""
    global llm, last_activity
    if llm is None:
        logger.info("Loading model into memory...")
        try:
            llm = Llama.from_pretrained(
                repo_id=model_repo,
                filename=model_file
            )
            last_activity = asyncio.get_event_loop().time()
            logger.info("Model loaded and ready for inference.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    else:
        logger.info("Model already loaded.")

async def unload_model():
    """Unload the LLM model to free memory"""
    global llm
    if llm is not None:
        logger.info("Unloading model to free memory...")
        del llm
        llm = None
        gc.collect()
        logger.info("Model unloaded.")

async def monitor_idle_time():
    """Monitor and unload model after idle timeout"""
    global last_activity
    while True:
        await asyncio.sleep(60)
        if llm and last_activity and (asyncio.get_event_loop().time() - last_activity) > IDLE_TIMEOUT:
            await unload_model()

async def handle_connection(websocket):
    """Handle WebSocket connections"""
    global last_activity
    user_id = None

    try:
        # Load model for local chat
        await load_model()
        await websocket.send(json.dumps({"type": "status", "content": "Model loaded and ready for inference."}))

        # Initialize database if not already done
        if db_manager.pool is None:
            try:
                await db_manager.initialize_pool()
                pool_status = await db_manager.get_pool_status()
                await websocket.send(json.dumps({
                    "type": "status",
                    "content": f"Database connection established successfully. Pool status: {pool_status['status']}"
                }))
            except Exception as e:
                logger.warning(f"Database initialization failed: {e}")
                await websocket.send(json.dumps({
                    "type": "warning", 
                    "content": f"Database connection failed: {str(e)}. Server will continue without database functionality."
                }))

        # Handle messages
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if "user_id" in data:
                    user_id = data["user_id"]

                if data.get("action") == "stop_generation":
                    if user_id:
                        stop_generation[user_id] = True
                        await websocket.send(json.dumps({
                            "type": "status",
                            "content": "Generation stopped by user request"
                        }))
                    continue

                if "messages" in data:
                    await handle_chat_request(websocket, data, user_id)
                    
            except json.JSONDecodeError as e:
                await websocket.send(json.dumps({
                    "type": "error",
                    "content": f"Invalid JSON: {str(e)}"
                }))
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await websocket.send(json.dumps({
                    "type": "error", 
                    "content": f"Error processing message: {str(e)}"
                }))

    except websockets.exceptions.ConnectionClosedOK:
        logger.info("Client disconnected normally.")
    except Exception as e:
        logger.error(f"Connection error: {e}")
        try:
            await websocket.send(json.dumps({
                "type": "error",
                "content": f"Connection error: {str(e)}"
            }))
        except:
            pass
    finally:
        if user_id:
            stop_generation.pop(user_id, None)
            active_generations.pop(user_id, None)

async def handle_chat_request(websocket, data, user_id):
    """Handle chat completion requests"""
    global last_activity, token_generation_metrics
    
    if user_id:
        stop_generation[user_id] = False
        active_generations[user_id] = True

    last_activity = asyncio.get_event_loop().time()
    messages = data["messages"]
    
    await websocket.send(json.dumps({
        "type": "status",
        "content": "Processing your request..."
    }))
    await websocket.send(json.dumps({
        "type": "hold", 
        "content": "Please wait while I generate the response..."
    }))

    full_response = ""
    token_count = 0
    session_start_time = time.time()
    first_token_time = None
    token_times = []
    
    try:
        # Generate response
        response_generator = llm.create_chat_completion(
            messages=messages,
            stream=True,
            max_tokens=2048,
            temperature=0,
        )
        
        for chunk in response_generator:
            if user_id and stop_generation.get(user_id, False):
                await websocket.send(json.dumps({
                    "type": "status",
                    "content": "Generation stopped by user"
                }))
                break
                
            if "choices" in chunk and len(chunk["choices"]) > 0:
                if "delta" in chunk["choices"][0] and "content" in chunk["choices"][0]["delta"]:
                    current_time = time.time()
                    content = chunk["choices"][0]["delta"]["content"]
                    full_response += content
                    token_count += 1
                    
                    # Record first token time (Time to First Token - TTFT)
                    if first_token_time is None:
                        first_token_time = current_time
                        ttft = first_token_time - session_start_time
                    
                    # Record inter-token time
                    if len(token_times) > 0:
                        inter_token_time = current_time - token_times[-1]
                    else:
                        inter_token_time = current_time - session_start_time
                    
                    token_times.append(current_time)
                    
                    await websocket.send(json.dumps({
                        "type": "chunk",
                        "content": content
                    }))
                    await asyncio.sleep(0.05)  # Slight delay for smoother streaming
                    
    except Exception as e:
        logger.error(f"Error during generation: {e}")
        await websocket.send(json.dumps({
            "type": "error",
            "content": f"Error during generation: {str(e)}"
        }))
        full_response = f"Error: {str(e)}"
    finally:
        if user_id:
            active_generations[user_id] = False
            stop_generation[user_id] = False

    # Calculate and log timing metrics
    session_end_time = time.time()
    total_session_time = session_end_time - session_start_time
    
    if token_count > 0 and total_session_time > 0:
        # Calculate metrics
        avg_time_per_token = total_session_time / token_count
        tokens_per_second = token_count / total_session_time
        
        # Calculate inter-token times (excluding TTFT)
        if len(token_times) > 1:
            inter_token_times = []
            for i in range(1, len(token_times)):
                inter_token_times.append(token_times[i] - token_times[i-1])
            avg_inter_token_time = statistics.mean(inter_token_times)
            median_inter_token_time = statistics.median(inter_token_times)
        else:
            avg_inter_token_time = total_session_time
            median_inter_token_time = total_session_time
        
        # Update global metrics
        token_generation_metrics["total_tokens"] += token_count
        token_generation_metrics["total_time"] += total_session_time
        token_generation_metrics["session_times"].append(total_session_time)
        token_generation_metrics["last_session_tokens"] = token_count
        token_generation_metrics["last_session_time"] = total_session_time
        token_generation_metrics["last_session_avg_time_per_token"] = avg_time_per_token
        
        # Keep only last 50 session times for rolling average
        if len(token_generation_metrics["session_times"]) > 50:
            token_generation_metrics["session_times"] = token_generation_metrics["session_times"][-50:]
        
        # Calculate overall averages
        overall_avg_time_per_token = token_generation_metrics["total_time"] / token_generation_metrics["total_tokens"]
        rolling_avg_session_time = statistics.mean(token_generation_metrics["session_times"])
        
        # Log detailed metrics
        logger.info("=" * 60)
        logger.info("TOKEN GENERATION METRICS")
        logger.info("=" * 60)
        logger.info(f"Session Stats:")
        logger.info(f"  • Tokens generated: {token_count}")
        logger.info(f"  • Total time: {total_session_time:.3f}s")
        logger.info(f"  • Time to first token (TTFT): {ttft:.3f}s" if first_token_time else "  • Time to first token: N/A")
        logger.info(f"  • Average time per token: {avg_time_per_token:.3f}s")
        logger.info(f"  • Tokens per second: {tokens_per_second:.2f}")
        logger.info(f"  • Average inter-token time: {avg_inter_token_time:.3f}s")
        logger.info(f"  • Median inter-token time: {median_inter_token_time:.3f}s")
        logger.info(f"Overall Stats:")
        logger.info(f"  • Total tokens generated: {token_generation_metrics['total_tokens']}")
        logger.info(f"  • Total generation time: {token_generation_metrics['total_time']:.3f}s")
        logger.info(f"  • Overall avg time per token: {overall_avg_time_per_token:.3f}s")
        logger.info(f"  • Overall tokens per second: {token_generation_metrics['total_tokens'] / token_generation_metrics['total_time']:.2f}")
        logger.info(f"  • Rolling avg session time (last 50): {rolling_avg_session_time:.3f}s")
        logger.info("=" * 60)
        
        # Send metrics to client
        await websocket.send(json.dumps({
            "type": "generation_metrics",
            "metrics": {
                "session": {
                    "tokens": token_count,
                    "total_time": round(total_session_time, 3),
                    "avg_time_per_token": round(avg_time_per_token, 3),
                    "tokens_per_second": round(tokens_per_second, 2),
                    "ttft": round(ttft, 3) if first_token_time else None,
                    "avg_inter_token_time": round(avg_inter_token_time, 3),
                    "median_inter_token_time": round(median_inter_token_time, 3)
                },
                "overall": {
                    "total_tokens": token_generation_metrics["total_tokens"],
                    "total_time": round(token_generation_metrics["total_time"], 3),
                    "avg_time_per_token": round(overall_avg_time_per_token, 3),
                    "tokens_per_second": round(token_generation_metrics["total_tokens"] / token_generation_metrics["total_time"], 2),
                    "rolling_avg_session_time": round(rolling_avg_session_time, 3)
                }
            }
        }))

    # Send completion
    await websocket.send(json.dumps({
        "type": "release_hold",
        "content": "Response generation complete"
    }))
    await websocket.send(json.dumps({
        "type": "complete",
        "content": full_response
    }))

    # Handle SQL execution if applicable
    if full_response and not stop_generation.get(user_id, False):
        await handle_sql_execution(websocket, full_response, user_id)

async def handle_sql_execution(websocket, response, user_id):
    """Handle SQL query execution from LLM response"""
    if not db_manager.pool:
        sql_query = extract_sql_from_response(response)
        if sql_query:
            await websocket.send(json.dumps({
                "type": "warning",
                "content": "SQL query detected but database connection is not available"
            }))
        return

    sql_query = extract_sql_from_response(response)
    if not sql_query:
        return

    await websocket.send(json.dumps({
        "type": "status",
        "content": "Executing SQL query on database..."
    }))
    await websocket.send(json.dumps({
        "type": "hold",
        "content": "Please wait while I execute the SQL query..."
    }))

    try:
        query_result = await db_manager.execute_query(sql_query)
        await websocket.send(json.dumps({
            "type": "release_hold",
            "content": "SQL execution complete"
        }))
        await websocket.send(json.dumps({
            "type": "sql_result", 
            "query": sql_query,
            "result": query_result
        }))
    except Exception as e:
        logger.error(f"SQL execution error: {e}")
        await websocket.send(json.dumps({
            "type": "release_hold",
            "content": "SQL execution failed"
        }))
        await websocket.send(json.dumps({
            "type": "sql_error",
            "query": sql_query,
            "error": str(e)
        }))

def update_user_context(user_id, message, is_user=True):
    """Update user context with new message"""
    role = "user" if is_user else "assistant"
    user_contexts[user_id].append({"role": role, "content": message})
    if len(user_contexts[user_id]) > MAX_CONTEXT_MESSAGES:
        user_contexts[user_id] = user_contexts[user_id][-MAX_CONTEXT_MESSAGES:]

def get_context_messages(user_id):
    """Get context messages for user"""
    return user_contexts[user_id]

async def main():
    """Main server function"""
    # Initialize database connection
    try:
        await db_manager.initialize_pool()
        pool_status = await db_manager.get_pool_status()
        logger.info(f"Database connection established successfully. Status: {pool_status}")
    except Exception as e:
        logger.warning(f"Could not initialize database connection: {e}")
        logger.info("Server will continue without database functionality")

    # Start idle monitoring
    asyncio.create_task(monitor_idle_time())

    # Start WebSocket server
    try:
        server = await websockets.serve(
            handle_connection, 
            "0.0.0.0", 
            8000,
            ping_interval=20,
            ping_timeout=10
        )
        logger.info("WebSocket server listening on ws://0.0.0.0:8000")
        await server.wait_closed()
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    asyncio.run(main())