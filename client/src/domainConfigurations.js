// Domain configurations extracted from the training data
export const domainConfigurations = [
  {
    id: 1,
    name: "Forestry",
    domain: "forestry",
    description: "Comprehensive data on sustainable forest management, timber production, wildlife habitat, and carbon sequestration in forestry.",
    icon: "🌲",
    color: "#059669",
    sampleQueries: [
      "What is the total volume of timber sold by each salesperson?",
      "Show me the timber sales data for the last quarter",
      "Which regions have the highest timber production?",
      "Find the average sale price per cubic meter of timber"
    ],
    schema: {
      "database_schema": {
        "salesperson": {
          "columns": [
            {"name": "salesperson_id", "type": "INT"},
            {"name": "name", "type": "TEXT"},
            {"name": "region", "type": "TEXT"}
          ]
        },
        "timber_sales": {
          "columns": [
            {"name": "sales_id", "type": "INT"},
            {"name": "salesperson_id", "type": "INT"},
            {"name": "volume", "type": "REAL"},
            {"name": "sale_date", "type": "DATE"}
          ]
        }
      }
    }
  },
  {
    id: 2,
    name: "Defense Industry",
    domain: "defense industry",
    description: "Defense contract data, military equipment maintenance, threat intelligence metrics, and veteran employment stats.",
    icon: "🛡️",
    color: "#7c3aed",
    sampleQueries: [
      "List all the unique equipment types and their maintenance frequency",
      "Which equipment requires the most frequent maintenance?",
      "Show me the maintenance schedule for all equipment types",
      "Find equipment with maintenance frequency above average"
    ],
    schema: {
      "database_schema": {
        "equipment_maintenance": {
          "columns": [
            {"name": "equipment_type", "type": "VARCHAR(255)"},
            {"name": "maintenance_frequency", "type": "INT"}
          ]
        }
      }
    }
  },
  {
    id: 3,
    name: "Marine Biology",
    domain: "marine biology",
    description: "Comprehensive data on marine species, oceanography, conservation efforts, and climate change impacts in marine biology.",
    icon: "🌊",
    color: "#0ea5e9",
    sampleQueries: [
      "How many marine species are found in the Southern Ocean?",
      "List all species found in tropical waters",
      "Show me the most common marine species by location",
      "Which locations have the highest biodiversity?"
    ],
    schema: {
      "database_schema": {
        "marine_species": {
          "columns": [
            {"name": "name", "type": "VARCHAR(50)"},
            {"name": "common_name", "type": "VARCHAR(50)"},
            {"name": "location", "type": "VARCHAR(50)"}
          ]
        }
      }
    }
  },
  {
    id: 4,
    name: "Financial Services",
    domain: "financial services",
    description: "Detailed financial data including investment strategies, risk management, fraud detection, customer analytics, and regulatory compliance.",
    icon: "💼",
    color: "#dc2626",
    sampleQueries: [
      "What is the total trade value and average price for each trader?",
      "Show me the top performing stocks by volume",
      "Find all trades above $10,000 in the last month",
      "Which traders have the highest total trade values?"
    ],
    schema: {
      "database_schema": {
        "trade_history": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "trader_id", "type": "INT"},
            {"name": "stock", "type": "VARCHAR(255)"},
            {"name": "price", "type": "DECIMAL(5)"},
            {"name": "quantity", "type": "INT"},
            {"name": "trade_time", "type": "TIMESTAMP"}
          ]
        }
      }
    }
  },
  {
    id: 5,
    name: "Energy",
    domain: "energy",
    description: "Energy market data covering renewable energy sources, energy storage, carbon pricing, and energy efficiency.",
    icon: "⚡",
    color: "#f59e0b",
    sampleQueries: [
      "Find the energy efficiency upgrades with the highest cost",
      "Show me all upgrade types and their average costs",
      "Which upgrades cost less than $5,000?",
      "List the most expensive energy efficiency upgrades"
    ],
    schema: {
      "database_schema": {
        "upgrades": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "cost", "type": "FLOAT"},
            {"name": "type", "type": "TEXT"}
          ]
        }
      }
    }
  },
  {
    id: 6,
    name: "Aquaculture",
    domain: "aquaculture",
    description: "Aquatic farming data, fish stock management, ocean health metrics, and sustainable seafood trends.",
    icon: "🐟",
    color: "#06b6d4",
    schema: {
      "database_schema": {
        "SpeciesWaterTemp": {
          "columns": [
            {"name": "SpeciesID", "type": "int"},
            {"name": "Date", "type": "date"},
            {"name": "WaterTemp", "type": "float"}
          ]
        }
      }
    }
  },
  {
    id: 7,
    name: "Nonprofit Operations",
    domain: "nonprofit operations",
    description: "Donation records, program outcomes, volunteer engagement metrics, budget reports, and community impact assessments.",
    icon: "🤝",
    color: "#8b5cf6",
    schema: {
      "database_schema": {
        "Program_Outcomes": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "program_id", "type": "INT"},
            {"name": "outcome_type", "type": "VARCHAR"},
            {"name": "value", "type": "INT"},
            {"name": "outcome_date", "type": "DATE"}
          ]
        }
      }
    }
  },
  {
    id: 8,
    name: "Public Transportation",
    domain: "public transportation",
    description: "Extensive data on route planning, fare collection, vehicle maintenance, and accessibility in public transportation.",
    icon: "🚌",
    color: "#10b981",
    sampleQueries: [
      "Find the total fare collected from passengers on 'Green Line' buses",
      "What are the most expensive bus routes?",
      "Show me all routes with their fare prices",
      "Which routes have fares above $5.00?"
    ],
    schema: {
      "database_schema": {
        "bus_routes": {
          "columns": [
            {"name": "route_name", "type": "VARCHAR(50)"},
            {"name": "fare", "type": "FLOAT"}
          ]
        }
      }
    }
  },
  {
    id: 9,
    name: "Real Estate",
    domain: "real estate",
    description: "Real estate data on inclusive housing policies, sustainable urbanism, property co-ownership, and housing affordability.",
    icon: "🏠",
    color: "#ef4444",
    schema: {
      "database_schema": {
        "Inclusive_Housing": {
          "columns": [
            {"name": "Property_ID", "type": "INT"},
            {"name": "Inclusive", "type": "VARCHAR(10)"},
            {"name": "Property_Size", "type": "INT"}
          ]
        }
      }
    }
  },
  {
    id: 10,
    name: "Rural Health",
    domain: "rural health",
    description: "Detailed records on healthcare access, disease prevalence, and resource allocation in rural health.",
    icon: "🏥",
    color: "#f97316",
    sampleQueries: [
      "What is the average income of farmers in each district in India?",
      "Show me the youngest farmers by district",
      "Which districts have farmers with income above 50,000?",
      "Find the total number of farmers per state"
    ],
    schema: {
      "database_schema": {
        "farmers_india": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "name", "type": "VARCHAR(255)"},
            {"name": "district_id", "type": "INT"},
            {"name": "age", "type": "INT"},
            {"name": "income", "type": "INT"}
          ]
        },
        "districts_india": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "name", "type": "VARCHAR(255)"},
            {"name": "state", "type": "VARCHAR(255)"}
          ]
        }
      }
    }
  },
  {
    id: 11,
    name: "Sustainable Infrastructure",
    domain: "sustainable infrastructure",
    description: "Green building data, renewable energy infrastructure projects, carbon offset initiatives, and smart city technology adoption.",
    icon: "🌱",
    color: "#22c55e",
    schema: {
      "database_schema": {
        "carbon_offsets": {
          "columns": [
            {"name": "initiative_id", "type": "INT"},
            {"name": "initiative_name", "type": "VARCHAR(255)"},
            {"name": "country", "type": "VARCHAR(255)"},
            {"name": "start_date", "type": "DATE"},
            {"name": "end_date", "type": "DATE"}
          ]
        }
      }
    }
  },
  {
    id: 12,
    name: "Beauty Industry",
    domain: "beauty industry",
    description: "Cosmetics sales data, beauty product ingredient transparency, consumer preferences, and sustainability metrics.",
    icon: "💄",
    color: "#ec4899",
    schema: {
      "database_schema": {
        "sustainability_metrics": {
          "columns": [
            {"name": "product_id", "type": "INT"},
            {"name": "carbon_footprint", "type": "INT"},
            {"name": "water_usage", "type": "INT"},
            {"name": "waste_generation", "type": "INT"},
            {"name": "region", "type": "VARCHAR(50)"}
          ]
        },
        "products": {
          "columns": [
            {"name": "product_id", "type": "INT"},
            {"name": "product_name", "type": "VARCHAR(50)"}
          ]
        }
      }
    }
  },
  {
    id: 13,
    name: "Automotive",
    domain: "automotive",
    description: "Vehicle safety testing results, autonomous driving research data, electric vehicle adoption statistics, and auto show information.",
    icon: "🚗",
    color: "#6366f1",
    schema: {
      "database_schema": {
        "vehicle_safety_testing": {
          "columns": [
            {"name": "id", "type": "INT", "constraints": "PRIMARY KEY"},
            {"name": "vehicle_model", "type": "VARCHAR(255)"},
            {"name": "test_score", "type": "FLOAT"}
          ]
        }
      }
    }
  },
  {
    id: 14,
    name: "Defense Security",
    domain: "defense security",
    description: "Detailed records on military technology, intelligence operations, national security, and cybersecurity strategies.",
    icon: "🔒",
    color: "#64748b",
    schema: {
      "database_schema": {
        "Armed_Forces": {
          "columns": [
            {"name": "base_id", "type": "INT"},
            {"name": "base_name", "type": "VARCHAR(50)"},
            {"name": "base_location", "type": "VARCHAR(50)"},
            {"name": "base_type", "type": "VARCHAR(50)"}
          ]
        }
      }
    }
  },
  {
    id: 15,
    name: "Arts Operations",
    domain: "arts operations and management",
    description: "Data on art collections, cultural event attendance, artist demographics, museum operations, and heritage preservation efforts.",
    icon: "🎨",
    color: "#a855f7",
    schema: {
      "database_schema": {
        "artist": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "name", "type": "VARCHAR(50)"}
          ]
        },
        "artists_valuation": {
          "columns": [
            {"name": "artist_id", "type": "INT"},
            {"name": "valuation", "type": "INT"}
          ]
        }
      }
    }
  },
  {
    id: 16,
    name: "Biotechnology",
    domain: "biotechnology",
    description: "Genetic research data, bioprocess engineering information, biotech startup funding, and biosensor technology development.",
    icon: "🧬",
    color: "#14b8a6",
    schema: {
      "database_schema": {
        "startups": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "name", "type": "VARCHAR(50)"},
            {"name": "domain", "type": "VARCHAR(50)"},
            {"name": "location", "type": "VARCHAR(50)"}
          ]
        },
        "funding": {
          "columns": [
            {"name": "id", "type": "INT"},
            {"name": "startup_id", "type": "INT"},
            {"name": "amount", "type": "DECIMAL(10)"},
            {"name": "purpose", "type": "VARCHAR(50)"}
          ]
        }
      }
    }
  }
];
