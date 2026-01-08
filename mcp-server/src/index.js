import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load environment variables from config/.env
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../config/.env") });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create MCP server
const server = new Server(
  {
    name: "tenderix-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================
// TOOLS
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_tenders",
      description: "List all tenders with optional status filter. Returns tender ID, title, issuing body, deadline, and status.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by status: 'active', 'completed', 'cancelled', or leave empty for all",
          },
          limit: {
            type: "number",
            description: "Maximum number of tenders to return (default: 20)",
          },
        },
      },
    },
    {
      name: "get_tender",
      description: "Get detailed information about a specific tender by ID, including all metadata and current processing step.",
      inputSchema: {
        type: "object",
        properties: {
          tender_id: {
            type: "string",
            description: "The UUID of the tender",
          },
        },
        required: ["tender_id"],
      },
    },
    {
      name: "get_gate_conditions",
      description: "Get all gate conditions (תנאי סף) for a specific tender with their status and evidence.",
      inputSchema: {
        type: "object",
        properties: {
          tender_id: {
            type: "string",
            description: "The UUID of the tender",
          },
        },
        required: ["tender_id"],
      },
    },
    {
      name: "get_gate_summary",
      description: "Get the gate conditions summary for a tender - eligibility status and recommendations.",
      inputSchema: {
        type: "object",
        properties: {
          tender_id: {
            type: "string",
            description: "The UUID of the tender",
          },
        },
        required: ["tender_id"],
      },
    },
    {
      name: "get_boq_items",
      description: "Get bill of quantities (כתב כמויות) items for a tender with pricing analysis.",
      inputSchema: {
        type: "object",
        properties: {
          tender_id: {
            type: "string",
            description: "The UUID of the tender",
          },
        },
        required: ["tender_id"],
      },
    },
    {
      name: "search_tenders",
      description: "Search tenders by title, issuing body, or keywords in Hebrew or English.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (Hebrew or English)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "trigger_n8n_workflow",
      description: "Trigger an n8n workflow by webhook URL for tender processing automation.",
      inputSchema: {
        type: "object",
        properties: {
          webhook_path: {
            type: "string",
            description: "The webhook path (e.g., 'tenderix/process' becomes /webhook/tenderix/process)",
          },
          payload: {
            type: "object",
            description: "JSON payload to send to the webhook",
          },
        },
        required: ["webhook_path"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_tenders": {
        let query = supabase
          .from("tenders")
          .select("id, tender_name, tender_number, issuing_body, submission_deadline, status, go_nogo_decision, category")
          .order("created_at", { ascending: false })
          .limit(args?.limit || 20);

        if (args?.status) {
          query = query.eq("status", args.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_tender": {
        const { data, error } = await supabase
          .from("tenders")
          .select("*")
          .eq("id", args.tender_id)
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_gate_conditions": {
        const { data, error } = await supabase
          .from("gate_conditions")
          .select("*")
          .eq("tender_id", args.tender_id)
          .order("condition_number");

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_gate_summary": {
        const { data, error } = await supabase
          .from("gate_conditions_summary")
          .select("*")
          .eq("tender_id", args.tender_id)
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_boq_items": {
        const { data, error } = await supabase
          .from("boq_items")
          .select("*")
          .eq("tender_id", args.tender_id)
          .order("item_number");

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "search_tenders": {
        const { data, error } = await supabase
          .from("tenders")
          .select("id, tender_name, tender_number, issuing_body, submission_deadline, status")
          .or(`tender_name.ilike.%${args.query}%,issuing_body.ilike.%${args.query}%`)
          .limit(10);

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "trigger_n8n_workflow": {
        const webhookUrl = `${process.env.N8N_WEBHOOK_URL}/${args.webhook_path}`;

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(args.payload || {}),
        });

        const result = await response.json();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: response.ok,
                status: response.status,
                result
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: error.message }),
        },
      ],
      isError: true,
    };
  }
});

// ============================================
// RESOURCES
// ============================================

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "tenderix://schema",
      name: "Database Schema",
      description: "Current Tenderix database schema and table definitions",
      mimeType: "application/json",
    },
    {
      uri: "tenderix://architecture",
      name: "System Architecture",
      description: "Tenderix v3 system architecture overview",
      mimeType: "text/plain",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "tenderix://schema") {
    // Return table information
    const tables = [
      "tenders", "gate_conditions", "gate_conditions_summary",
      "boq_items", "contract_analysis", "sow_analysis",
      "quality_scoring_model", "activity_log"
    ];

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ tables, description: "Tenderix tender intelligence database" }, null, 2),
        },
      ],
    };
  }

  if (uri === "tenderix://architecture") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Tenderix v3 Architecture - 4 Pillars:

P1: Tender Intake (קליטת מכרז)
- Document upload and classification
- Metadata extraction
- Text normalization
- Definition extraction

P2: Gate Conditions (תנאי סף)
- Condition extraction and classification
- Company profile matching
- Gap analysis
- Clarification questions

P3: Specs & BOQ (מפרט וכתב כמויות)
- Technical specification analysis
- Bill of quantities parsing
- Scope of work extraction
- Pricing risk assessment

P4: Competitors (מתחרים)
- Competitor identification
- Historical bid analysis
- Pricing intelligence

Output: GO/NO-GO Decision Report`,
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tenderix MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
