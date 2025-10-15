# ChromaDB Setup Instructions

## Overview

This project is configured to use ChromaDB for persistent memory via the MCP (Model Context Protocol) server.

**Project Collection**: `project_memory`
**Data Directory**: `/Users/bradleytangonan/Desktop/my apps/music-playground/.chroma`

## Automatic Setup

Your ChromaDB configuration is complete and ready to use. Claude will:
- Auto-read `CLAUDE.md` at session start
- Load memory discipline instructions from `.claude/settings.local.json`
- Connect to ChromaDB via `.mcp.json` configuration

## Manual ChromaDB Commands

### Create Collection (First Use)
```javascript
mcp__chroma__chroma_create_collection {
  "collection_name": "project_memory"
}
```

### Query Existing Memories
```javascript
mcp__chroma__chroma_query_documents {
  "collection_name": "project_memory",
  "query_texts": ["your search query"],
  "n_results": 5
}
```

### Add New Memory
```javascript
mcp__chroma__chroma_add_documents {
  "collection_name": "project_memory",
  "documents": ["Your memory text under 300 chars"],
  "metadatas": [{
    "type": "decision",
    "tags": "architecture,api",
    "source": "file"
  }],
  "ids": ["stable-unique-id"]
}
```

### List All Collections
```javascript
mcp__chroma__chroma_list_collections {}
```

### Get Collection Info
```javascript
mcp__chroma__chroma_get_collection_info {
  "collection_name": "project_memory"
}
```

### Get Documents from Collection
```javascript
mcp__chroma__chroma_get_documents {
  "collection_name": "project_memory",
  "limit": 10
}
```

## Memory Schema

**Documents**: 1-2 sentences, under 300 characters

**Metadata**:
- `type`: "decision" | "fix" | "tip" | "preference"
- `tags`: comma-separated keywords
- `source`: "file" | "PR" | "spec" | "issue"

**IDs**: Stable string identifiers for updating existing memories

## Troubleshooting

### MCP Server Not Connecting

1. **Verify uvx is installed**:
   ```bash
   command -v uvx
   ```
   If missing: `pip install --user uv`

2. **Check .mcp.json is valid JSON**:
   ```bash
   jq . .mcp.json
   ```

3. **Test ChromaDB MCP manually**:
   ```bash
   uvx -qq chroma-mcp --client-type persistent --data-dir .chroma
   ```

4. **Check MCP server logs**: Look for connection errors in Claude's debug output

### Collection Not Found

Collections are created on demand. Run `chroma_create_collection` before first use.

### Memory Not Persisting

- Verify `.chroma/` directory exists and is writable
- Check that `data-dir` in `.mcp.json` uses absolute path
- Ensure ChromaDB server stays alive (CHROMA_SERVER_KEEP_ALIVE=0 disables auto-shutdown)

### Permission Errors

Check `.claude/settings.local.json` has appropriate MCP server permissions:
```json
{
  "mcpServers": {
    "chroma": {
      "alwaysAllow": [
        "chroma_list_collections",
        "chroma_create_collection",
        "chroma_add_documents",
        "chroma_query_documents",
        "chroma_get_documents"
      ]
    }
  }
}
```

## Best Practices

### When to Log
- After solving tricky problems
- When making architectural decisions
- After discovering patterns or gotchas
- When user expresses preferences
- Every 5 interactions (checkpoint)

### What to Log
- **Decisions**: "Chose REST over GraphQL for simpler client integration"
- **Fixes**: "Fixed race condition by adding mutex lock in auth.js:45"
- **Tips**: "Use absolute imports to avoid ../../../ chains"
- **Preferences**: "User prefers TypeScript strict mode enabled"

### What NOT to Log
- Secrets, API keys, passwords
- Sensitive user data
- Temporary debugging notes
- Duplicate information

## Next Steps

1. Start Claude from this directory: `claude`
2. Claude will auto-load CLAUDE.md and memory instructions
3. Create collection on first use: `chroma_create_collection`
4. Begin logging discoveries as you work
5. Query memories at session start to resume context
