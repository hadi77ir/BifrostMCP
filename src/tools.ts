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
        name: "read_file_safe",
        description: "Safely reads a file from the workspace.",
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
        name: "apply_patch_review",
        description: "Applies a unified diff patch to a file with a diff preview and review queue.",
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
    }
];

export const toolsDescriptions = [
    {
        name: "find_usages",
        description: "Find all references to a symbol"
    },
    {
        name: "go_to_definition",
        description: "Find definition of a symbol"
    },
    {
        name: "find_implementations",
        description: "Find implementations of interface/abstract method"
    },
    {
        name: "get_hover_info",
        description: "Get hover information for a symbol"
    },
    {
        name: "get_document_symbols",
        description: "Get all symbols in document"
    },
    {
        name: "get_completions",
        description: "Get code completion suggestions at a position"
    },
    {
        name: "get_signature_help",
        description: "Get function signature information"
    },
    {
        name: "get_rename_locations",
        description: "Get all locations that would be affected by renaming a symbol"
    },
    {
        name: "rename",
        description: "Rename a symbol"
    },
    {
        name: "get_code_actions",
        description: "Get available code actions and refactorings"
    },
    {
        name: "get_semantic_tokens",
        description: "Get semantic token information for code understanding"
    },
    {
        name: "get_call_hierarchy",
        description: "Get incoming and outgoing call hierarchy"
    },
    {
        name: "get_type_hierarchy",
        description: "Get type hierarchy information"
    },
    {
        name: "get_code_lens",
        description: "Gets CodeLens information for a document, showing actionable contextual information inline with code"
    },
    {
        name: "get_selection_range",
        description: "Gets selection ranges for smart selection expansion"
    },
    {
        name: "get_type_definition",
        description: "Find type definitions of symbols"
    },
    {
        name: "get_declaration",
        description: "Find declarations of symbols"
    },
    {
        name: "get_document_highlights",
        description: "Find all highlights of a symbol in document"
    },
    {
        name: "get_workspace_symbols",
        description: "Search for symbols across the workspace"
    },
    {
        name: "list_formatters",
        description: "List available formatters for a document"
    },
    {
        name: "format_document",
        description: "Format a document using the default or a chosen formatter"
    },
    {
        name: "run_terminal_command",
        description: "Execute a shell command and capture output"
    },
    {
        name: "search_regex",
        description: "Regex search with context across the workspace"
    },
    {
        name: "list_files",
        description: "List workspace files (common ignores applied)"
    },
    {
        name: "summarize_definitions",
        description: "Summarize document definitions via document symbols"
    },
    {
        name: "list_source_actions",
        description: "List available source actions for a document/range"
    },
    {
        name: "run_source_action",
        description: "Execute a chosen source action"
    },
    {
        name: "list_refactor_actions",
        description: "List available refactor actions at a position"
    },
    {
        name: "run_refactor_action",
        description: "Execute a chosen refactor action"
    },
    {
        name: "get_workspace_diagnostics",
        description: "Get diagnostic information for the workspace (per-file problems with severities)."
    },
    {
        name: "get_file_diagnostics",
        description: "Get diagnostic information for a specific file."
    },
    {
        name: "get_open_files",
        description: "List currently open editors, marking the active one and cursor positions."
    },
    {
        name: "read_file_safe",
        description: "Safely read file contents from the workspace."
    },
    {
        name: "apply_patch_review",
        description: "Queue a unified diff patch with diff preview and review controls."
    },
    {
        name: "copy_file",
        description: "Copy a file within the workspace.",
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
        description: "Move/rename a file within the workspace (requires user confirmation).",
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
        description: "Delete a file in the workspace (requires user confirmation).",
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
        description: "Ask the user a question with multiple button choices via VS Code notification.",
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
        description: "Lists available test tasks in the workspace."
    },
    {
        name: "run_test",
        description: "Runs a selected test task and returns its result.",
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
        description: "Runs all test tasks in the workspace and returns their results."
    },
    {
        name: "get_last_test_results",
        description: "Returns the most recent test task results gathered by run_test or run_all_tests."
    },
    {
        name: "insert_lines",
        description: "Insert lines into a file at a specific line number.",
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
        description: "Remove a range of lines from a file.",
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
        description: "Replace a range of lines with new content.",
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
        description: "List workspace files with pagination and optional glob (can include ignored paths like node_modules).",
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
        description: "Returns a shallow tree view of the workspace, marking ignored entries.",
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
        name: "list_tests",
        description: "Lists available test tasks in the workspace.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "run_test",
        description: "Runs a selected test task and returns its result.",
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
        description: "Runs all test tasks in the workspace and returns their results.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_last_test_results",
        description: "Returns the most recent test task results gathered by run_test or run_all_tests.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "read_range",
        description: "Read a specific line/character range from a file.",
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
                    description: "Range to read",
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
    }
];
