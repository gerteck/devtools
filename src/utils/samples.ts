export const SAMPLES = {
  json: JSON.stringify(
    {
      name: "devtools",
      version: "2.4.0",
      description: "Essential client-side developer utility suite",
      openSource: true,
      license: "MIT",
      features: [
        "Interactive JSON Tree Viewer",
        "Side-by-side Diff Checker",
        "Mermaid Diagram Studio",
        "SVG & High-res PNG Export"
      ],
      author: {
        github: "https://github.com",
        active: true,
        contributions: 142
      },
      settings: {
        theme: "dark",
        editor: {
          tabSize: 2,
          minimap: false,
          wordWrap: "on"
        },
        telemetry: null
      },
      stats: {
        stars: 1250,
        forks: 89,
        weeklyDownloads: 45200.5
      }
    },
    null,
    2
  ),

  diffOriginal: JSON.stringify(
    {
      name: "devtools-service",
      version: "1.0.0",
      environment: "staging",
      port: 8080,
      cors: {
        enabled: true,
        origins: ["https://staging.devtools.dev"]
      },
      database: {
        host: "db.staging.internal",
        poolSize: 10,
        ssl: true
      },
      features: {
        enableTelemetry: false,
        betaFeatures: true
      }
    },
    null,
    2
  ),

  diffModified: JSON.stringify(
    {
      name: "devtools-service",
      version: "1.1.0",
      environment: "production",
      port: 8443,
      cors: {
        enabled: true,
        origins: ["https://devtools.dev", "https://app.devtools.dev"]
      },
      database: {
        host: "db.prod.internal",
        poolSize: 25,
        ssl: true
      },
      features: {
        enableTelemetry: true,
        betaFeatures: false,
        cacheLayer: "redis-cluster"
      }
    },
    null,
    2
  ),

  mermaidFlowchart: `graph TD
    A[Client Request] --> B{API Gateway}
    B -->|Authorized| C[Auth Service]
    B -->|Direct Asset| D[Static CDN]
    C -->|Valid Token| E[Microservices Cluster]
    C -->|Unauthorized| F[401 JSON Response]
    E --> G[(Primary PostgreSQL)]
    E --> H[(Redis Cache)]
    H -.->|Cache Hit| E`,

  mermaidSequence: `sequenceDiagram
    autonumber
    actor User
    participant Browser as DevTools UI
    participant Worker as Monaco Worker
    participant Parser as JSON / Mermaid Engine

    User->>Browser: Types code or drops payload
    Browser->>Worker: Debounced syntax parse event
    Worker->>Parser: Validate syntax AST
    alt Valid Syntax
        Parser-->>Browser: Return clean AST & diagnostics (OK)
        Browser->>User: Render Interactive Visualizer
    else Syntax Error
        Parser-->>Browser: Return line:col error pointer
        Browser->>User: Highlight error line & show banner
    end`,

  mermaidArchitecture: `flowchart LR
    subgraph Client ["Browser Client-Side Sandbox"]
      UI[Svelte 5 Runes App]
      Monaco[Monaco Code Editor]
      MermaidEngine[Mermaid.js SVG Renderer]
      Tree[Interactive Tree View]
    end

    subgraph Storage ["Local Persistence"]
      LocalStorage[(Web localStorage)]
    end

    subgraph Export ["Export Subsystem"]
      SVG[Vector SVG Downloader]
      Canvas[HTML5 Canvas PNG Rasterizer]
    end

    UI <--> LocalStorage
    UI --> Monaco
    UI --> MermaidEngine
    UI --> Tree
    MermaidEngine --> SVG
    MermaidEngine --> Canvas`,

  mermaidERD: `erDiagram
    USER ||--o{ PROJECT : owns
    PROJECT ||--|{ DIAGRAM : contains
    PROJECT ||--o{ JSON_PAYLOAD : stores
    USER {
        string id PK
        string email
        string display_name
        timestamp created_at
    }
    PROJECT {
        string id PK
        string user_id FK
        string name
        boolean is_public
    }
    DIAGRAM {
        string id PK
        string project_id FK
        string type
        string syntax_code
        timestamp updated_at
    }`
};
