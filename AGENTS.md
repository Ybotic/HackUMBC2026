# Solana development

For Solana-related work, prefer the `solana-mcp` tools over model memory so
answers reflect current Solana documentation.

- For non-trivial Solana questions, call `list_sections` first to find relevant
  documentation sources and sections.
- Use `get_documentation` for canonical docs, and
  `Solana_Documentation_Search` or `Solana_Expert__Ask_For_Help` for narrow
  how-to questions and debugging.
- Whenever you write or modify Solana program Rust, call `program_autofixer`
  before returning the code. Apply its suggested fixes, then call it again;
  repeat until `require_another_tool_call_after_fixing` is `false`.
   


