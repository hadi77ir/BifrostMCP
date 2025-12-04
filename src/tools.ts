export const mcpTools = [
    {
        name: "find_usages",
        description: 
            "Finds all references to a symbol at a specified location in code. This tool helps you identify where functions, variables, types, or other symbols are used throughout the codebase. " +
            "It performs a deep semantic analysis to find true references, not just text matches. " +
            "The results include:\n" +
            "- Complete file path for each reference\n" +
            "- Precise location (line and character position)\n" +
            "- Context preview showing how the symbol is used\n" +
            "- Optional inclusion of the symbol's declaration\n\n" +
            "This is particularly useful for:\n" +
            "- Understanding dependencies between different parts of the code\n" +
            "- Safely planning refactoring operations\n" +
            "- Analyzing the impact of potential changes\n" +
            "- Tracing data flow through the application\n\n" +
            "Note: Line numbers are 0-based (first line is 0), while character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document (file:///path/to/file format)"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "One-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                },
                context: {
                    type: "object",
                    description: "Additional context for the request",
                    properties: {
                        includeDeclaration: {
                            type: "boolean",
                            description: "Whether to include the declaration of the symbol in the results",
                            default: true
                        }
                    }
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "go_to_definition",
        description: "Navigates to the original definition of a symbol at a specified location in code. " +
            "This tool performs semantic analysis to find the true source definition, not just matching text. It can locate:\n" +
            "- Function/method declarations\n" +
            "- Class/interface definitions\n" +
            "- Variable declarations\n" +
            "- Type definitions\n" +
            "- Import/module declarations\n\n" +
            "The tool is essential for:\n" +
            "- Understanding where code elements are defined\n" +
            "- Navigating complex codebases\n" +
            "- Verifying the actual implementation of interfaces/abstractions\n\n" +
            "Note: Line numbers are 0-based (first line is 0), while character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "One-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "find_implementations",
        description: "Discovers all concrete implementations of an interface, abstract class, or abstract method in the codebase. " +
            "This tool performs deep semantic analysis to find all places where:\n" +
            "- Interfaces are implemented by classes\n" +
            "- Abstract classes are extended\n" +
            "- Abstract methods are overridden\n" +
            "- Virtual methods are overridden\n\n" +
            "This is particularly valuable for:\n" +
            "- Understanding polymorphic behavior in the codebase\n" +
            "- Finding all concrete implementations of an interface\n" +
            "- Analyzing inheritance hierarchies\n" +
            "- Verifying contract implementations\n\n" +
            "Note: Line numbers are 0-based (first line is 0), while character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "One-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_hover_info",
        description: "Retrieves comprehensive information about a symbol when hovering over it in code. " +
            "This tool provides rich contextual details including:\n" +
            "- Full type information and signatures\n" +
            "- Documentation comments and summaries\n" +
            "- Return types and parameter descriptions\n" +
            "- Type constraints and generic parameters\n" +
            "- Deprecation notices and version information\n\n" +
            "This is especially useful for:\n" +
            "- Understanding API usage and requirements\n" +
            "- Viewing documentation without leaving the context\n" +
            "- Verifying type information during development\n" +
            "- Quick access to symbol metadata\n\n" +
            "Note: Line numbers are 0-based (first line is 0), while character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "One-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_document_symbols",
        description: "Analyzes and returns a hierarchical list of all symbols defined within a document. " +
            "This tool provides a comprehensive overview of the code structure by identifying:\n" +
            "- Classes and interfaces\n" +
            "- Methods and functions\n" +
            "- Properties and fields\n" +
            "- Namespaces and modules\n" +
            "- Constants and enumerations\n\n" +
            "The symbols are returned in a structured format that preserves their relationships and scope. " +
            "This is particularly useful for:\n" +
            "- Understanding the overall structure of a file\n" +
            "- Creating code outlines and documentation\n" +
            "- Navigating large files efficiently\n" +
            "- Analyzing code organization and architecture",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to analyze",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "get_completions",
        description: "Provides intelligent code completion suggestions based on the current context and cursor position. " +
            "This tool analyzes the code to offer relevant suggestions including:\n" +
            "- Variable and function names\n" +
            "- Class and type names\n" +
            "- Property and method completions\n" +
            "- Import statements\n" +
            "- Snippets and common patterns\n\n" +
            "The suggestions are context-aware and can be triggered by:\n" +
            "- Typing part of a symbol name\n" +
            "- Accessing object properties (.)\n" +
            "- Opening brackets or parentheses\n" +
            "- Language-specific triggers\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to get completions for",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position to get completions at",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                },
                triggerCharacter: {
                    type: "string",
                    description: "Optional trigger character that caused completion"
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_signature_help",
        description: "Provides detailed information about function signatures as you type function calls. " +
            "This tool offers real-time assistance with:\n" +
            "- Parameter names and types\n" +
            "- Parameter documentation\n" +
            "- Overload information\n" +
            "- Return type details\n" +
            "- Generic type constraints\n\n" +
            "The signature help is context-sensitive and updates as you type, showing:\n" +
            "- Currently active parameter\n" +
            "- Available overloads\n" +
            "- Type compatibility information\n" +
            "- Optional and default values\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to get signature help for",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position to get signature help at",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_rename_locations",
        description: "Identifies all locations that need to be updated when renaming a symbol. " +
            "This tool performs a comprehensive analysis to ensure safe and accurate renaming by:\n" +
            "- Finding all references to the symbol\n" +
            "- Checking for naming conflicts\n" +
            "- Analyzing scope boundaries\n" +
            "- Identifying related declarations\n\n" +
            "The tool is particularly valuable for:\n" +
            "- Safe refactoring operations\n" +
            "- Cross-file symbol renaming\n" +
            "- Impact analysis before renaming\n" +
            "- Maintaining code consistency\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol to rename",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol to rename",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                },
                newName: {
                    type: "string",
                    description: "The new name for the symbol"
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "rename",
        description: "Identifies all locations that need to be updated when renaming a symbol, and performs the renaming. " +
            "This tool performs a comprehensive analysis to ensure safe and accurate renaming by:\n" +
            "- Finding all references to the symbol\n" +
            "- Checking for naming conflicts\n" +
            "- Analyzing scope boundaries\n" +
            "- Identifying related declarations\n\n" +
            "The tool is particularly valuable for:\n" +
            "- Safe refactoring operations\n" +
            "- Cross-file symbol renaming\n" +
            "- Maintaining code consistency\n\n" +
            "- Renaming without the need to generate code\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol to rename",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol to rename",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                },
                newName: {
                    type: "string",
                    description: "The new name for the symbol"
                }
            },
            required: ["textDocument", "position", "newName"]
        }
    },
    {
        name: "get_code_actions",
        description: "Provides context-aware code actions and refactoring suggestions at a specified location. " +
            "This tool analyzes the code to offer intelligent improvements such as:\n" +
            "- Quick fixes for errors and warnings\n" +
            "- Code refactoring options\n" +
            "- Import management suggestions\n" +
            "- Code style improvements\n" +
            "- Performance optimizations\n\n" +
            "Available actions may include:\n" +
            "- Extract method/variable/constant\n" +
            "- Implement interface members\n" +
            "- Add missing imports\n" +
            "- Convert code constructs\n" +
            "- Fix code style issues\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to get code actions for",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position to get code actions at",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "get_semantic_tokens",
        description: "Provides detailed semantic token information for enhanced code understanding and highlighting. " +
            "This tool performs deep analysis to identify and classify code elements:\n" +
            "- Variables and their scopes\n" +
            "- Function and method names\n" +
            "- Type names and annotations\n" +
            "- Keywords and operators\n" +
            "- Comments and documentation\n\n" +
            "The semantic information enables:\n" +
            "- Precise syntax highlighting\n" +
            "- Code navigation improvements\n" +
            "- Better code understanding\n" +
            "- Accurate symbol classification\n" +
            "- Enhanced code analysis",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to get semantic tokens for",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "get_call_hierarchy",
        description: "Analyzes and visualizes the call relationships between functions and methods in the codebase. " +
            "This tool builds a comprehensive call graph showing:\n" +
            "- Incoming calls (who calls this function)\n" +
            "- Outgoing calls (what this function calls)\n" +
            "- Call chains and dependencies\n" +
            "- Recursive call patterns\n\n" +
            "This information is invaluable for:\n" +
            "- Understanding code flow and dependencies\n" +
            "- Analyzing impact of changes\n" +
            "- Debugging complex call chains\n" +
            "- Optimizing function relationships\n" +
            "- Identifying potential refactoring targets\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the function",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the function",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_type_hierarchy",
        description: "Analyzes and visualizes the inheritance and implementation relationships between types. " +
            "This tool creates a comprehensive type hierarchy showing:\n" +
            "- Parent classes and interfaces\n" +
            "- Child classes and implementations\n" +
            "- Interface inheritance chains\n" +
            "- Mixin and trait relationships\n\n" +
            "The hierarchy information is crucial for:\n" +
            "- Understanding class relationships\n" +
            "- Analyzing inheritance patterns\n" +
            "- Planning class structure changes\n" +
            "- Identifying potential abstraction opportunities\n" +
            "- Verifying type system design\n\n" +
            "Note: Line numbers are 0-based (first line is 0), and character positions are 0-based (first character is 0).",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the type",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the type",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_code_lens",
        description: "Gets CodeLens information for a document, showing actionable contextual information inline with code",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to get CodeLens for",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "get_selection_range",
        description: "Gets selection ranges for a position in a document. This helps in smart selection expansion based on semantic document structure.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to analyze",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position to get selection ranges for",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_type_definition",
        description: "Finds type definitions of a symbol at a specified location. This is particularly useful for finding the underlying type definitions of variables, interfaces, and classes.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_declaration",
        description: "Finds declarations of a symbol at a specified location. This helps in navigating to where symbols are declared, particularly useful for imported symbols.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document containing the symbol",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_document_highlights",
        description: "Finds all highlights of a symbol in a document. This is useful for highlighting all occurrences of a symbol within the current document.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to analyze",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "The position of the symbol",
                    properties: {
                        line: {
                            type: "number",
                            description: "Zero-based line number"
                        },
                        character: {
                            type: "number",
                            description: "Zero-based character position"
                        }
                    },
                    required: ["line", "character"]
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "get_workspace_symbols",
        description: "Searches for symbols across the entire workspace. This is useful for finding symbols by name across all files. Especially useful for finding the file and positions of a symbol to use in other tools.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query for finding symbols"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "list_formatters",
        description: "Lists available document formatters for a given file, including the current default formatter.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to inspect for formatters",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "format_document",
        description: "Formats a document using the default formatter or a specified formatter if provided. Supports full-document or range formatting.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to format",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                formatterId: {
                    type: "string",
                    description: "Optional formatter extension identifier (e.g., esbenp.prettier-vscode). If omitted, the default formatter is used."
                },
                range: {
                    type: "object",
                    description: "Optional range to format; if omitted, formats the entire document.",
                    properties: {
                        start: {
                            type: "object",
                            properties: {
                                line: { type: "number", description: "Zero-based line number" },
                                character: { type: "number", description: "Zero-based character position" }
                            },
                            required: ["line", "character"]
                        },
                        end: {
                            type: "object",
                            properties: {
                                line: { type: "number", description: "Zero-based line number" },
                                character: { type: "number", description: "Zero-based character position" }
                            },
                            required: ["line", "character"]
                        }
                    },
                    required: ["start", "end"]
                },
                options: {
                    type: "object",
                    description: "Optional formatting options to override editor defaults.",
                    properties: {
                        tabSize: { type: "number", description: "Tab size to use for formatting" },
                        insertSpaces: { type: "boolean", description: "Whether to use spaces instead of tabs" }
                    }
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "run_terminal_command",
        description: "Executes a shell command from the workspace. Uses VS Code terminal shell integration when available, or falls back to a child process. Returns captured output, stderr, and exit code.",
        inputSchema: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "Shell command to execute"
                },
                cwd: {
                    type: "string",
                    description: "Optional working directory for the command"
                },
                timeoutMs: {
                    type: "number",
                    description: "Optional timeout in milliseconds (default 10000)"
                }
            },
            required: ["command"]
        }
    },
    {
        name: "run_vscode_command",
        description: "Executes a VS Code command by id with optional arguments, only after explicit user approval. Use this for one-off invocations of built-in or extension commands (for example, saving all files or toggling UI state) when no dedicated MCP tool exists. Prefer more specific tools where possible; this is a general escape hatch. Returns the raw result from the VS Code command so callers can assert on outcomes.",
        inputSchema: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "VS Code command identifier (e.g., workbench.action.files.saveAll)"
                },
                args: {
                    type: "array",
                    description: "Optional positional arguments to pass to the command",
                    items: {}
                }
            },
            required: ["command"]
        }
    },
    {
        name: "search_regex",
        description: "Performs a regex search across the workspace (or a specific folder), returning matches with surrounding context.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Regular expression pattern to search for"
                },
                folder: {
                    type: "string",
                    description: "Optional workspace-relative folder path to scope the search"
                },
                maxResults: {
                    type: "number",
                    description: "Maximum number of matches to return (default 50)"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "list_files",
        description: "Lists files in the current workspace (excluding common build and VCS folders) up to a specified limit.",
        inputSchema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Maximum number of files to return (default 200)"
                }
            }
        }
    },
    {
        name: "summarize_definitions",
        description: "Summarizes symbols/definitions in a document using document symbols as a lightweight structure.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to analyze",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "list_source_actions",
        description: "Lists available source actions (organize imports, fix all, etc.) for a document/range.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to inspect",
                    properties: {
                        uri: {
                            type: "string",
                            description: "URI of the document"
                        }
                    },
                    required: ["uri"]
                },
                range: {
                    type: "object",
                    description: "Optional range to scope source actions",
                    properties: {
                        start: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        },
                        end: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        }
                    }
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "run_source_action",
        description: "Runs a selected source action for the given document/range.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to act on",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                range: {
                    type: "object",
                    description: "Optional range to scope the action",
                    properties: {
                        start: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        },
                        end: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        }
                    }
                },
                title: {
                    type: "string",
                    description: "Title of the source action to execute"
                },
                kind: {
                    type: "string",
                    description: "Optional CodeActionKind to match a specific action"
                }
            },
            required: ["textDocument", "title"]
        }
    },
    {
        name: "list_refactor_actions",
        description: "Lists available refactor code actions at a position.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to inspect",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "Position to request refactors",
                    properties: {
                        line: { type: "number" },
                        character: { type: "number" }
                    },
                    required: ["line", "character"]
                },
                range: {
                    type: "object",
                    description: "Optional range to scope the refactor",
                    properties: {
                        start: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        },
                        end: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        }
                    }
                }
            },
            required: ["textDocument", "position"]
        }
    },
    {
        name: "run_refactor_action",
        description: "Executes a selected refactor action at a position.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to refactor",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                position: {
                    type: "object",
                    description: "Position to request refactors",
                    properties: {
                        line: { type: "number" },
                        character: { type: "number" }
                    },
                    required: ["line", "character"]
                },
                range: {
                    type: "object",
                    description: "Optional range to scope the refactor",
                    properties: {
                        start: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        },
                        end: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        }
                    }
                },
                kind: {
                    type: "string",
                    description: "Optional CodeActionKind to match a specific action"
                },
                title: {
                    type: "string",
                    description: "Title of the refactor action to execute"
                }
            },
            required: ["textDocument", "position", "title"]
        }
    },
    {
        name: "get_workspace_diagnostics",
        description: "Returns diagnostic information for all files in the workspace (errors, warnings, etc.).",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_file_diagnostics",
        description: "Returns diagnostic information for a specific file.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to inspect",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "get_open_files",
        description: "Returns currently open editors in the workspace, indicating the active editor and its cursor position.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_cursor_context",
        description: "Returns a window of text around the current cursor and injects a random HTML-like tag at the exact cursor offset so you can jump back to it later. " +
            "Use this to capture nearby code for analysis while remembering the precise cursor location; pair the returned tag with move_cursor for deterministic navigation.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "Optional document to read context from; defaults to active editor",
                    properties: {
                        uri: { type: "string" }
                    }
                },
                before: {
                    type: "number",
                    description: "How many lines above the cursor to include",
                    default: 3
                },
                after: {
                    type: "number",
                    description: "How many lines below the cursor to include",
                    default: 3
                }
            }
        }
    },
    {
        name: "move_cursor",
        description: "Moves the cursor in a document either to a specific line/character position, to a generated cursor tag (e.g., <cursor-abc123>), or to the first occurrence of a string. " +
            "Use this to programmatically focus the editor on a target location before performing follow-up actions (like edits or inspections). " +
            "You can provide an explicit position for deterministic jumps, a tag returned by get_cursor_context, or a search string to navigate to the first (or nth) match in the file. " +
            "The command opens the document if needed, updates the active selection, and reveals the position in the editor so you can immediately read or edit nearby code. " +
            "Prefer this over manual navigation when driving automated reviews, scripted refactors, or guided debugging flows.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "Optional document whose cursor should be moved",
                    properties: {
                        uri: { type: "string" }
                    }
                },
                position: {
                    type: "object",
                    description: "Exact zero-based position to move the cursor to (preferred for deterministic jumps)",
                    properties: {
                        line: { type: "number" },
                        character: { type: "number" }
                    },
                    required: ["line", "character"]
                },
                searchString: {
                    type: "string",
                    description: "If provided, moves the cursor to the first match of this string (or the nth match via occurrence)"
                },
                occurrence: {
                    type: "number",
                    description: "When using searchString, which occurrence to jump to (1-based, defaults to 1)",
                    default: 1
                },
                tag: {
                    type: "string",
                    description: "Optional cursor tag emitted by get_cursor_context to jump back to that precise location"
                }
            },
            required: []
        }
    },
    {
        name: "get_cursor_position",
        description: "Reports the current cursor position (line and character) in the active editor along with the document URI. Use this to confirm navigation or chain position-based commands.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "read_file_safe",
        description: "Safely reads a file from the workspace without mutating it. Returns the URI, language identifier, and raw content so you can reason about the file before editing. Use this for read-only context or when validating a file exists prior to other actions.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to read",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                }
            },
            required: ["textDocument"]
        }
    },
    {
        name: "read_range",
        description: "Reads a specific line and character range from a file so only the relevant snippet is retrieved. Ideal for large files where sending the whole file would be noisy or expensive. Prefer this over read_file_safe when you need a precise excerpt for review or follow-up tools.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to read",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                range: {
                    type: "object",
                    description: "Range to read (zero-based, end exclusive)",
                    properties: {
                        start: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        },
                        end: {
                            type: "object",
                            properties: {
                                line: { type: "number" },
                                character: { type: "number" }
                            },
                            required: ["line", "character"]
                        }
                    },
                    required: ["start", "end"]
                }
            },
            required: ["textDocument", "range"]
        }
    },
    {
        name: "apply_patch_review",
        description: "Applies a unified diff patch to a file while queuing it for review, ensuring changes can be inspected before they land. Useful for batching edits from multiple commands and keeping a clear audit trail. Prefer this over direct edits when you want a reversible, reviewable workflow.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to patch",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                patch: {
                    type: "string",
                    description: "Unified diff patch content"
                }
            },
            required: ["textDocument", "patch"]
        }
    },
    {
        name: "insert_lines",
        description: "Inserts one or more lines at a specific zero-based index without disturbing the rest of the file. Useful for programmatically adding imports, configuration blocks, or scaffolding. Prefer this over replace_lines when you only need to add new content.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to edit",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                line: {
                    type: "number",
                    description: "Zero-based line number to insert before"
                },
                lines: {
                    type: "array",
                    description: "Lines to insert",
                    items: { type: "string" }
                }
            },
            required: ["textDocument", "line", "lines"]
        }
    },
    {
        name: "remove_lines",
        description: "Removes a contiguous range of lines using zero-based offsets. Great for cleaning up dead code, generated sections, or redundant comments while preserving surrounding context. Prefer this when you want to drop content entirely instead of replacing it.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to edit",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                startLine: {
                    type: "number",
                    description: "Zero-based start line (inclusive)"
                },
                endLine: {
                    type: "number",
                    description: "Zero-based end line (exclusive)"
                }
            },
            required: ["textDocument", "startLine", "endLine"]
        }
    },
    {
        name: "replace_lines",
        description: "Replaces a range of lines with new content, enabling targeted patches without rewriting entire files. Use this for updating function bodies, config blocks, or docs while keeping the rest intact. Prefer this over separate remove/insert steps when transforming a block in one go.",
        inputSchema: {
            type: "object",
            properties: {
                textDocument: {
                    type: "object",
                    description: "The document to edit",
                    properties: {
                        uri: { type: "string" }
                    },
                    required: ["uri"]
                },
                startLine: {
                    type: "number",
                    description: "Zero-based start line (inclusive)"
                },
                endLine: {
                    type: "number",
                    description: "Zero-based end line (exclusive)"
                },
                lines: {
                    type: "array",
                    description: "Replacement lines",
                    items: { type: "string" }
                }
            },
            required: ["textDocument", "startLine", "endLine", "lines"]
        }
    },
    {
        name: "list_files_paginated",
        description: "Lists workspace files with pagination and optional glob filters so you can explore large repos safely. Helpful when you need to page through results or include normally ignored paths like node_modules. Prefer this over list_files when the project is huge or you need tighter scope control.",
        inputSchema: {
            type: "object",
            properties: {
                glob: {
                    type: "string",
                    description: "Glob pattern to include (defaults to **/*)"
                },
                exclude: {
                    type: "string",
                    description: "Optional glob to exclude (e.g., **/.git/**)"
                },
                page: {
                    type: "number",
                    description: "Page number (1-based, default 1)"
                },
                pageSize: {
                    type: "number",
                    description: "Items per page (default 100)"
                }
            }
        }
    },
    {
        name: "get_workspace_tree",
        description: "Builds a shallow tree view of the workspace and marks entries that are normally ignored. Useful for quickly understanding folder structure and spotting hidden assets without traversing every file. Prefer this over flat lists when hierarchy matters.",
        inputSchema: {
            type: "object",
            properties: {
                maxEntries: {
                    type: "number",
                    description: "Maximum entries to return (default 200)"
                }
            }
        }
    },
    {
        name: "copy_file",
        description: "Copies a file from one URI to another, overwriting if needed. Ideal for templating, backups, or duplicating examples before editing. Prefer this when you want to keep the original file intact instead of moving it.",
        inputSchema: {
            type: "object",
            properties: {
                source: { type: "string", description: "URI of the source file" },
                destination: { type: "string", description: "URI of the destination file" }
            },
            required: ["source", "destination"]
        }
    },
    {
        name: "move_file",
        description: "Moves or renames a file to a new URI with overwrite support and safety prompts. Useful for refactors that relocate modules or assets. Prefer this over copy_file when the source should be removed after relocation.",
        inputSchema: {
            type: "object",
            properties: {
                source: { type: "string", description: "URI of the source file" },
                destination: { type: "string", description: "URI of the destination file" }
            },
            required: ["source", "destination"]
        }
    },
    {
        name: "delete_file",
        description: "Deletes a file in the workspace (using the trash when available) with confirmation to avoid mistakes. Use this to clean up obsolete assets or generated artifacts safely.",
        inputSchema: {
            type: "object",
            properties: {
                uri: { type: "string", description: "URI of the file to delete" }
            },
            required: ["uri"]
        }
    },
    {
        name: "prompt_user_choice",
        description: "Displays a prompt with button choices and returns the user's selection, enabling interactive workflows. Use this to confirm risky actions or let the user pick between strategies.",
        inputSchema: {
            type: "object",
            properties: {
                message: { type: "string", description: "Question to ask the user" },
                choices: {
                    type: "array",
                    description: "Buttons to present",
                    items: { type: "string" },
                    minItems: 1
                }
            },
            required: ["message", "choices"]
        }
    },
    {
        name: "list_tests",
        description: "Enumerates VS Code tasks tagged as tests so you can see what suites are available. Helpful before kicking off targeted or full test runs.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "run_test",
        description: "Runs a named test task, waits for completion, and records the exit code. Use this for focused test runs or reproducing a specific suite without triggering everything.",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the test task to run"
                }
            },
            required: ["name"]
        }
    },
    {
        name: "run_all_tests",
        description: "Executes all registered test tasks sequentially and returns their results. Ideal for full validation passes before a commit or release.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_last_test_results",
        description: "Returns the most recent test task outcomes without rerunning them. Useful for surfacing results to the agent or UI after execution.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "list_run_configurations",
        description: "Reads .vscode/launch.json and lists available run/debug configurations. Use this to discover what launch targets exist before starting or editing them.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "add_run_configuration",
        description: "Adds a new launch configuration (creating launch.json if needed) so the project gains a reusable debug/run target. Prefer this for programmatic setup of new scenarios.",
        inputSchema: {
            type: "object",
            properties: {
                configuration: {
                    type: "object",
                    description: "Launch configuration to add",
                    properties: {
                        name: { type: "string", description: "Name of the configuration" },
                        type: { type: "string", description: "Debugger type (e.g., node, pwa-node)" },
                        request: { type: "string", description: "Request type (launch or attach)" },
                        program: { type: "string", description: "Entry point or program to run" }
                    },
                    required: ["name"]
                }
            },
            required: ["configuration"]
        }
    },
    {
        name: "update_run_configuration",
        description: "Updates fields of an existing launch configuration by name, merging partial changes. Use this to tweak args, env, or debugger settings without rebuilding the file manually.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the configuration to update" },
                configuration: {
                    type: "object",
                    description: "Partial configuration fields to merge"
                }
            },
            required: ["name", "configuration"]
        }
    },
    {
        name: "delete_run_configuration",
        description: "Removes a launch configuration from launch.json by name to keep the list clean. Handy when deprecating old debug targets.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the configuration to delete" }
            },
            required: ["name"]
        }
    },
    {
        name: "start_debug_configuration",
        description: "Starts a launch configuration with debugging enabled so breakpoints and watches are honored. Use when you need full debugging rather than a plain run.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the configuration to start" }
            },
            required: ["name"]
        }
    },
    {
        name: "start_no_debug_configuration",
        description: "Runs a launch configuration without attaching the debugger, skipping breakpoint overhead. Ideal for quick executions when debugging is unnecessary.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the configuration to start without debugging" }
            },
            required: ["name"]
        }
    },
    {
        name: "list_build_tasks",
        description: "Lists build tasks defined in .vscode/tasks.json so you can see available build pipelines. Useful prior to running or modifying tasks.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "add_build_task",
        description: "Adds a build task definition to tasks.json, creating the file if needed. Prefer this when scaffolding build commands programmatically.",
        inputSchema: {
            type: "object",
            properties: {
                task: {
                    type: "object",
                    description: "Task definition to add",
                    properties: {
                        label: { type: "string", description: "Display label for the task" },
                        type: { type: "string", description: "Task type (e.g., shell, process, npm)" }
                    },
                    required: ["label"]
                }
            },
            required: ["task"]
        }
    },
    {
        name: "update_build_task",
        description: "Updates fields of an existing build task by label, merging provided values. Use this to refine commands or options without rewriting the entire tasks.json entry.",
        inputSchema: {
            type: "object",
            properties: {
                label: { type: "string", description: "Label of the build task to update" },
                task: {
                    type: "object",
                    description: "Partial task fields to merge"
                }
            },
            required: ["label", "task"]
        }
    },
    {
        name: "remove_build_task",
        description: "Removes a build task by label to retire obsolete build steps. Helps keep tasks.json lean.",
        inputSchema: {
            type: "object",
            properties: {
                label: { type: "string", description: "Label of the build task to remove" }
            },
            required: ["label"]
        }
    },
    {
        name: "run_build_task",
        description: "Runs a build task by label with confirmation and returns the exit code. Prefer this over run_terminal_command when you want to reuse VS Code task definitions and problem matchers.",
        inputSchema: {
            type: "object",
            properties: {
                label: { type: "string", description: "Label of the build task to run" }
            },
            required: ["label"]
        }
    },
    {
        name: "debug_status",
        description: "Reports whether a debug session is active and lists current sessions with their identifiers. Use this to gate debug operations or to surface session metadata to a client UI.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_stop",
        description: "Stops the active debug session cleanly. Use this when you need to halt execution and tear down debugging state without closing VS Code. Prefer this over continuing or stepping when you want to end the session immediately.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_step_over",
        description: "Debugger control to step over the next statement without entering functions. Useful for skimming high-level flow quickly.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_step_into",
        description: "Steps into the next function call for detailed inspection. Prefer this when you need to analyze inner logic.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_step_out",
        description: "Steps out of the current function back to the caller. Handy after inspecting nested code to resume higher-level debugging.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_continue",
        description: "Resumes program execution until the next breakpoint or termination. Use after finishing inspections or adjusting watches.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_add_watch",
        description: "Adds an expression to the watch list so its value is evaluated across debug steps. Prefer this to repeatedly inspecting locals when tracking a specific variable.",
        inputSchema: {
            type: "object",
            properties: {
                expression: { type: "string", description: "Expression to watch" }
            },
            required: ["expression"]
        }
    },
    {
        name: "debug_list_watches",
        description: "Lists all current watch expressions for review or sharing. Useful when coordinating debugging steps programmatically.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_remove_watch",
        description: "Removes a watch expression to reduce noise in the watch list. Use this when an expression is no longer relevant.",
        inputSchema: {
            type: "object",
            properties: {
                expression: { type: "string", description: "Expression to remove from the watch list" }
            },
            required: ["expression"]
        }
    },
    {
        name: "debug_watch_values",
        description: "Evaluates all watch expressions against the current debug frame and returns values or errors. Great for quick state snapshots while stepping.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_get_locals",
        description: "Retrieves local variables for the active debug frame, including scope information. Prefer this when you need a structured view of current state.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_get_call_stack",
        description: "Returns the current call stack with function names and locations. Helpful for understanding execution context when a breakpoint hits.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_add_breakpoint",
        description: "Adds a function or source-line breakpoint, supporting optional conditions and log messages. Use this to instrument code paths quickly without manual UI navigation.",
        inputSchema: {
            type: "object",
            properties: {
                functionName: { type: "string", description: "Function name to break on" },
                uri: { type: "string", description: "URI of the file for a source breakpoint" },
                line: { type: "number", description: "Zero-based line for a source breakpoint" },
                condition: { type: "string", description: "Optional breakpoint condition" },
                logMessage: { type: "string", description: "Optional log message for tracepoints" }
            }
        }
    },
    {
        name: "debug_remove_breakpoint",
        description: "Removes breakpoints by function name or file/line so you stop pausing there. Useful for cleaning up targeted breakpoints after use.",
        inputSchema: {
            type: "object",
            properties: {
                functionName: { type: "string", description: "Function breakpoint to remove" },
                uri: { type: "string", description: "URI of the file for a source breakpoint" },
                line: { type: "number", description: "Zero-based line for a source breakpoint" }
            }
        }
    },
    {
        name: "debug_disable_all_breakpoints",
        description: "Disables all breakpoints without deleting them. Prefer this when you want a clean run but plan to re-enable breakpoints later.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debug_remove_all_breakpoints",
        description: "Completely removes every breakpoint for a fresh debugging state. Use this when resetting or before handing off the project.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    }
];

const toolShortDescriptions: Record<string, string> = {
    "find_usages": "Find all references to a symbol",
    "go_to_definition": "Find definition of a symbol",
    "find_implementations": "Find implementations of interface/abstract method",
    "get_hover_info": "Get hover information for a symbol",
    "get_document_symbols": "Get all symbols in document",
    "get_completions": "Get code completion suggestions at a position",
    "get_signature_help": "Get function signature information",
    "get_rename_locations": "Get all locations that would be affected by renaming a symbol",
    "rename": "Rename a symbol",
    "get_code_actions": "Get available code actions and refactorings",
    "get_semantic_tokens": "Get semantic token information for code understanding",
    "get_call_hierarchy": "Get incoming and outgoing call hierarchy",
    "get_type_hierarchy": "Get type hierarchy information",
    "get_code_lens": "Get CodeLens items inline with actionable info",
    "get_selection_range": "Get selection ranges for smart selection expansion",
    "get_type_definition": "Find type definitions of symbols",
    "get_declaration": "Find declarations of symbols",
    "get_document_highlights": "Find all highlights of a symbol in document",
    "get_workspace_symbols": "Search for symbols across the workspace",
    "list_formatters": "List available formatters for a document",
    "format_document": "Format a document using the default or a chosen formatter",
    "run_terminal_command": "Execute a shell command and capture output",
    "run_vscode_command": "Execute a VS Code command (requires approval)",
    "search_regex": "Regex search with context across the workspace",
    "list_files": "List workspace files (common ignores applied)",
    "summarize_definitions": "Summarize document definitions via document symbols",
    "list_source_actions": "List available source actions for a document/range",
    "run_source_action": "Execute a chosen source action",
    "list_refactor_actions": "List available refactor actions at a position",
    "run_refactor_action": "Execute a chosen refactor action on current symbol",
    "get_workspace_diagnostics": "Get diagnostic information for the workspace",
    "get_file_diagnostics": "Get diagnostic information for a specific file",
    "get_open_files": "List currently open editors and selections",
    "get_cursor_context": "Capture tagged context around the current cursor",
    "move_cursor": "Move the cursor to a position or text match in a file",
    "get_cursor_position": "Report the active cursor line/character",
    "read_file_safe": "Safely read file contents from the workspace",
    "read_range": "Read a specific line/character range from a file",
    "apply_patch_review": "Queue a unified diff patch with review controls",
    "insert_lines": "Insert lines into a file at a specific line number",
    "remove_lines": "Remove a range of lines from a file",
    "replace_lines": "Replace a range of lines with new content",
    "list_files_paginated": "List workspace files with pagination and optional glob",
    "get_workspace_tree": "Return a shallow tree view of the workspace",
    "copy_file": "Copy a file within the workspace",
    "move_file": "Move or rename a file within the workspace",
    "delete_file": "Delete a file in the workspace",
    "prompt_user_choice": "Ask the user a question with multiple choices",
    "list_tests": "List available test tasks in the workspace",
    "run_test": "Run a selected test task",
    "run_all_tests": "Run all test tasks in the workspace",
    "get_last_test_results": "Return the most recent test task results",
    "list_run_configurations": "List run/debug configurations from launch.json",
    "add_run_configuration": "Add a launch configuration",
    "update_run_configuration": "Update an existing launch configuration",
    "delete_run_configuration": "Delete a launch configuration by name",
    "start_debug_configuration": "Start a launch configuration with debugging",
    "start_no_debug_configuration": "Run a launch configuration without debugging",
    "list_build_tasks": "List build tasks from tasks.json",
    "add_build_task": "Add a build task to tasks.json",
    "update_build_task": "Update fields of a build task",
    "remove_build_task": "Remove a build task by label",
    "run_build_task": "Run a build task by label",
    "debug_status": "Report whether a debug session is active",
    "debug_stop": "Stop the active debug session",
    "debug_step_over": "Step over the next statement while debugging",
    "debug_step_into": "Step into the next function call",
    "debug_step_out": "Step out to the caller frame",
    "debug_continue": "Resume debugger execution",
    "debug_add_watch": "Add an expression to the debugger watch list",
    "debug_list_watches": "List all watched expressions",
    "debug_remove_watch": "Remove a watched expression",
    "debug_watch_values": "Evaluate watched expressions in the current frame",
    "debug_get_locals": "Inspect locals from the active debug frame",
    "debug_get_call_stack": "Show the current debug call stack",
    "debug_add_breakpoint": "Add a function or source breakpoint",
    "debug_remove_breakpoint": "Remove a function or line breakpoint",
    "debug_disable_all_breakpoints": "Disable all breakpoints without deleting them",
    "debug_remove_all_breakpoints": "Remove all breakpoints completely"
};

export const toolsDescriptions = mcpTools.map(tool => ({
    name: tool.name,
    description: toolShortDescriptions[tool.name] ?? "No description"
}));
