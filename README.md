# EdgeQuery: Intelligent Text-to-SQL Generation System

EdgeQuery is a comprehensive AI-powered system that converts natural language questions into SQL queries using a fine-tuned Llama 3.2-3B model. The system provides an intuitive web interface for users to interact with databases using plain English, while the AI handles the complex task of SQL generation with step-by-step reasoning.

## Features

- **Intelligent SQL Generation**: Convert natural language to SQL with 85-90% accuracy
- **Multi-Domain Support**: Pre-configured domains including forestry, energy, healthcare, finance, and more
- **Step-by-Step Reasoning**: Model explains its thought process before generating SQL
- **Real-Time Streaming**: WebSocket-based real-time response streaming
- **Interactive Web Interface**: Modern React-based frontend with dark/light themes
- **Token Metrics**: Performance monitoring and generation speed analytics
- **Domain Configuration**: Easy setup for new database schemas and domains
- **SQL Result Display**: Execute and display query results (when connected to database)

## Architecture

The system consists of three main components:

1. **Fine-tuned Language Model**: Llama 3.2-3B specialized for Text-to-SQL generation
2. **Python Backend Server**: WebSocket server handling model inference and database connections
3. **React Frontend**: Interactive web interface for user interactions

## Quick Start

### Prerequisites

- Python 3.8+ (recommended: Python 3.10+)
- Node.js 16+ and npm
- At least 8GB RAM (for model inference)
- GPU recommended but not required

### Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd fyp
   ```

2. **Set up Python Backend**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Set up React Frontend**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Download the Model**
   
   The model will be automatically downloaded on first run, or you can pre-download it:
   ```bash
   python -c "from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='devMubashir/llama-3.2-3b-ttsql-reasoning-v4', filename='unsloth.Q4_K_M.gguf', local_dir='models')"
   ```

### Running the System

1. **Start the Backend Server**
   ```bash
   # From the project root directory
   python server.py
   ```
   
   The server will start on `ws://localhost:8765` and automatically download the model if needed.

2. **Start the Frontend (in a new terminal)**
   ```bash
   cd client
   npm start
   ```
   
   The web interface will open at `http://localhost:3000`

3. **Start Using EdgeQuery**
   - Open your browser to `http://localhost:3000`
   - Configure a domain (or use pre-configured ones)
   - Start asking questions in natural language!

## Usage Guide

### Domain Configuration

Before generating SQL queries, you need to set up a domain with:

1. **Domain Name**: e.g., "E-commerce"
2. **Domain Description**: Brief description of the data domain
3. **Database Schema**: CREATE TABLE statements defining your database structure

**Example Domain Setup:**
```
Domain Name: E-commerce
Description: Online retail database with products, customers, and orders
Schema: 
CREATE TABLE products (id INT, name TEXT, price DECIMAL, category TEXT);
CREATE TABLE customers (id INT, name TEXT, email TEXT, city TEXT);
CREATE TABLE orders (id INT, customer_id INT, product_id INT, quantity INT, order_date DATE);
```

### Pre-configured Domains

The system comes with several pre-configured domains:
- **Forestry**: Timber sales, forest management
- **Energy**: Renewable sources, efficiency metrics
- **Healthcare**: Patient records, treatments
- **Finance**: Transactions, portfolios
- **E-commerce**: Products, customers, orders
- **Education**: Students, courses, grades

### Example Queries

Once configured, you can ask questions like:

- "What are the top 5 best-selling products?"
- "Show me customers who placed orders in the last month"
- "What's the average order value by city?"
- "Find products that haven't been ordered recently"

### Query Format

The model responds with:
1. **Reasoning**: Step-by-step explanation of the approach
2. **SQL Query**: The generated SQL code
3. **Confidence**: Model's confidence in the result

## Model Training

The EdgeQuery model is fine-tuned using a specialized dataset of 6,000 high-quality Text-to-SQL reasoning examples. 

### Training Your Own Model

To train your own version:

1. **Prepare Training Data**
   - Use the format in `code/formatted12.json`
   - Include system prompts, user queries, and assistant responses with reasoning

2. **Run Training Notebook**
   ```bash
   cd "model training"
   jupyter notebook Edgequery.ipynb
   ```

3. **Training Process**
   - Uses Unsloth for 2x faster training
   - LoRA fine-tuning for efficiency
   - Response-only training for better SQL generation
   - Training time: ~45 minutes on Tesla T4 GPU

### Model Deployment Options

The trained model can be exported in multiple formats:
- **LoRA Adapters**: ~100MB, for development
- **Merged 16-bit**: ~6GB, for production inference
- **GGUF Q8_0**: ~3GB, for local deployment
- **GGUF Q4_K_M**: ~2GB, for edge/mobile deployment

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
WEBSOCKET_PORT=8765
WEBSOCKET_HOST=localhost

# Model Configuration
MODEL_REPO=devMubashir/llama-3.2-3b-ttsql-reasoning-v4
MODEL_FILE=unsloth.Q4_K_M.gguf
DEVICE=cpu  # or 'cuda' for GPU

# Database Configuration (optional)
DATABASE_URL=postgresql://username:password@localhost:5432/database

# Model Parameters
MAX_TOKENS=512
TEMPERATURE=0.1
```

### Customizing Domains

Edit `client/src/domainConfigurations.js` to add new pre-configured domains:

```javascript
export const domainConfigurations = {
  "your-domain": {
    name: "Your Domain",
    description: "Description of your domain",
    schema: "CREATE TABLE ...",
    suggestions: [
      "Sample question 1?",
      "Sample question 2?"
    ]
  }
};
```

## Development

### Project Structure

```
fyp/
├── server.py              # WebSocket server and model inference
├── requirements.txt       # Python dependencies
├── client/               # React frontend application
│   ├── src/
│   │   ├── App.js        # Main application component
│   │   ├── components/   # UI components
│   │   └── domainConfigurations.js
│   └── package.json
├── model training/       # Model training notebooks and scripts
│   └── Edgequery.ipynb  # Main training notebook
├── code/                # Training data and preprocessing
│   └── formatted12.json # Training dataset
└── models/              # Stored model files
```

### Backend API

The WebSocket server accepts JSON messages:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8765');

// Send query
ws.send(JSON.stringify({
  type: 'generate_sql',
  user_id: 'user123',
  message: 'Your natural language query',
  domain_context: {
    name: 'Domain Name',
    description: 'Domain description',
    schema: 'CREATE TABLE ...'
  }
}));

// Receive streaming response
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle streaming tokens and final response
};
```

### Frontend Components

Key React components:
- `App.js`: Main application logic and state management
- `FormattedResponse.js`: Displays model responses with syntax highlighting
- `SqlResultDisplay.js`: Shows SQL execution results
- `TokenMetricsDisplay.js`: Performance metrics and statistics

## Performance Optimization

### For Better Performance:

1. **Use GPU**: Install CUDA and set `DEVICE=cuda` in `.env`
2. **Increase RAM**: Close other applications during inference
3. **SSD Storage**: Store model files on fast storage
4. **Network**: Use local deployment to avoid network latency

### Expected Performance:
- **CPU Inference**: ~2-5 tokens/second
- **GPU Inference**: ~10-30 tokens/second
- **Memory Usage**: 6-8GB RAM
- **Model Size**: ~2GB (Q4_K_M quantization)

## Troubleshooting

### Common Issues:

1. **Model Download Fails**
   - Check internet connection
   - Verify Hugging Face Hub access
   - Try manual download with browser

2. **WebSocket Connection Failed**
   - Ensure port 8765 is available
   - Check firewall settings
   - Verify server is running

3. **Out of Memory Errors**
   - Close other applications
   - Use smaller batch sizes
   - Consider using Q4 quantization

4. **Slow Generation**
   - Use GPU if available
   - Check system resources
   - Reduce max_tokens setting

### Getting Help

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all dependencies are correctly installed
4. Ensure sufficient system resources

## Contributing

To contribute to EdgeQuery:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Setup

```bash
# Install development dependencies
pip install -r requirements.txt
cd client && npm install

# Run tests
python -m pytest tests/
cd client && npm test

# Code formatting
black server.py
cd client && npm run format
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Unsloth**: For providing the efficient fine-tuning framework
- **Llama**: For the base language model architecture
- **Hugging Face**: For model hosting and transformers library
- **React**: For the frontend framework

## Citation

If you use EdgeQuery in your research or project, please cite:

```bibtex
@software{edgequery2025,
  title={EdgeQuery: Intelligent Text-to-SQL Generation System},
  author={[Your Name]},
  year={2025},
  url={https://github.com/[your-username]/edgequery}
}
```

---

**EdgeQuery - Making database queries as easy as asking questions in plain English!**
