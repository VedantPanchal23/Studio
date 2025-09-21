import { lspService } from '../../services/lspService'

/**
 * Monaco Editor LSP Integration
 * Provides Language Server Protocol features for Monaco Editor
 */
export class MonacoLSPIntegration {
  constructor() {
    this.editor = null
    this.monaco = null
    this.disposables = []
    this.activeLanguage = null
    this.activeUri = null
    this.diagnosticsDecorations = []
    this.diagnosticsInterval = null
    this.isInitialized = false
  }

  /**
   * Initialize LSP integration with Monaco Editor
   * @param {Object} editor - Monaco Editor instance
   * @param {Object} monaco - Monaco namespace
   */
  initialize(editor, monaco) {
    this.editor = editor
    this.monaco = monaco
    
    // Initialize LSP service
    lspService.initialize()
    
    this.setupEventHandlers()
    this.setupProviders()
    this.isInitialized = true
  }

  /**
   * Set up event handlers for LSP service
   */
  setupEventHandlers() {
    // Handle diagnostics from LSP server
    lspService.on('diagnostics', (params) => {
      this.handleDiagnostics(params)
    })

    // Handle server messages
    lspService.on('showMessage', (params) => {
      this.showMessage(params)
    })

    // Handle server errors
    lspService.on('error', (data) => {
      console.error('LSP Error:', data.error)
    })
  }

  /**
   * Set up Monaco providers for LSP features
   */
  setupProviders() {
    // Get all supported languages from LSP service
    const supportedLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python', 'java', 'go', 'rust', 'c', 'cpp']
    
    // Register providers for all supported languages
    supportedLanguages.forEach(language => {
      // Completion provider
      this.disposables.push(
        this.monaco.languages.registerCompletionItemProvider(language, {
          triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '#'],
          provideCompletionItems: async (model, position, context, token) => {
            return this.provideCompletionItems(model, position, context, token)
          }
        })
      )

      // Hover provider
      this.disposables.push(
        this.monaco.languages.registerHoverProvider(language, {
          provideHover: async (model, position, token) => {
            return this.provideHover(model, position, token)
          }
        })
      )

      // Definition provider
      this.disposables.push(
        this.monaco.languages.registerDefinitionProvider(language, {
          provideDefinition: async (model, position, token) => {
            return this.provideDefinition(model, position, token)
          }
        })
      )

      // References provider
      this.disposables.push(
        this.monaco.languages.registerReferenceProvider(language, {
          provideReferences: async (model, position, context, token) => {
            return this.provideReferences(model, position, context, token)
          }
        })
      )

      // Signature help provider
      this.disposables.push(
        this.monaco.languages.registerSignatureHelpProvider(language, {
          signatureHelpTriggerCharacters: ['(', ',', '<'],
          signatureHelpRetriggerCharacters: [')'],
          provideSignatureHelp: async (model, position, token, context) => {
            return this.provideSignatureHelp(model, position, token, context)
          }
        })
      )

      // Document formatting provider
      this.disposables.push(
        this.monaco.languages.registerDocumentFormattingEditProvider(language, {
          provideDocumentFormattingEdits: async (model, options, token) => {
            return this.provideDocumentFormattingEdits(model, options, token)
          }
        })
      )

      // Range formatting provider
      this.disposables.push(
        this.monaco.languages.registerDocumentRangeFormattingEditProvider(language, {
          provideDocumentRangeFormattingEdits: async (model, range, options, token) => {
            return this.provideDocumentRangeFormattingEdits(model, range, options, token)
          }
        })
      )

      // Document symbol provider
      this.disposables.push(
        this.monaco.languages.registerDocumentSymbolProvider(language, {
          provideDocumentSymbols: async (model, token) => {
            return this.provideDocumentSymbols(model, token)
          }
        })
      )

      // Code action provider
      this.disposables.push(
        this.monaco.languages.registerCodeActionProvider(language, {
          provideCodeActions: async (model, range, context, token) => {
            return this.provideCodeActions(model, range, context, token)
          }
        })
      )

      // Rename provider
      this.disposables.push(
        this.monaco.languages.registerRenameProvider(language, {
          provideRenameEdits: async (model, position, newName, token) => {
            return this.provideRenameEdits(model, position, newName, token)
          },
          resolveRenameLocation: async (model, position, token) => {
            return this.resolveRenameLocation(model, position, token)
          }
        })
      )
    })

    // Set up real-time diagnostics
    this.setupDiagnosticsProvider()
  }

  /**
   * Open a document in LSP server
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {string} language - Language identifier
   */
  async openDocument(filePath, content, language) {
    try {
      // Ensure LSP server is running for this language
      if (!lspService.hasActiveServer(language)) {
        const workspaceRoot = this.getWorkspaceRoot()
        await lspService.startServer(language, workspaceRoot)
      }

      const uri = lspService.pathToUri(filePath)
      const languageId = lspService.getLanguageId(filePath)
      
      lspService.openDocument(uri, languageId, content)
      
      this.activeUri = uri
      this.activeLanguage = language
    } catch (error) {
      console.error('Failed to open document in LSP:', error)
    }
  }

  /**
   * Update document content in LSP server
   * @param {string} filePath - File path
   * @param {string} newContent - New content
   */
  updateDocument(filePath, newContent) {
    try {
      const uri = lspService.pathToUri(filePath)
      
      // Create content change for full document replacement
      const contentChanges = [{
        text: newContent
      }]
      
      lspService.changeDocument(uri, contentChanges)
    } catch (error) {
      console.error('Failed to update document in LSP:', error)
    }
  }

  /**
   * Close document in LSP server
   * @param {string} filePath - File path
   */
  closeDocument(filePath) {
    try {
      const uri = lspService.pathToUri(filePath)
      lspService.closeDocument(uri)
      
      if (this.activeUri === uri) {
        this.activeUri = null
        this.activeLanguage = null
      }
    } catch (error) {
      console.error('Failed to close document in LSP:', error)
    }
  }

  /**
   * Provide completion items
   * @param {Object} model - Monaco model
   * @param {Object} position - Position in document
   * @param {Object} context - Completion context
   * @param {Object} token - Cancellation token
   * @returns {Promise<Object>} Completion items
   */
  async provideCompletionItems(model, position, context, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return { suggestions: [] }

      const result = await lspService.getCompletion(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      })

      if (!result || !result.items || token?.isCancellationRequested) {
        return { suggestions: [] }
      }

      const suggestions = result.items.map(item => {
        const suggestion = {
          label: item.label,
          kind: this.convertCompletionItemKind(item.kind),
          insertText: item.insertText || item.label,
          detail: item.detail,
          documentation: this.convertMarkdownString(item.documentation),
          sortText: item.sortText,
          filterText: item.filterText,
          preselect: item.preselect,
          additionalTextEdits: item.additionalTextEdits?.map(edit => ({
            range: {
              startLineNumber: edit.range.start.line + 1,
              startColumn: edit.range.start.character + 1,
              endLineNumber: edit.range.end.line + 1,
              endColumn: edit.range.end.character + 1
            },
            text: edit.newText
          }))
        }

        // Handle text edit range
        if (item.textEdit) {
          suggestion.range = {
            startLineNumber: item.textEdit.range.start.line + 1,
            startColumn: item.textEdit.range.start.character + 1,
            endLineNumber: item.textEdit.range.end.line + 1,
            endColumn: item.textEdit.range.end.character + 1
          }
          suggestion.insertText = item.textEdit.newText
        }

        // Handle snippet support
        if (item.insertTextFormat === 2) { // Snippet
          suggestion.insertTextRules = this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        }

        return suggestion
      })

      return { 
        suggestions,
        incomplete: result.isIncomplete || false
      }
    } catch (error) {
      console.error('Error providing completion items:', error)
      return { suggestions: [] }
    }
  }

  /**
   * Provide hover information
   * @param {Object} model - Monaco model
   * @param {Object} position - Position in document
   * @param {Object} token - Cancellation token
   * @returns {Promise<Object>} Hover information
   */
  async provideHover(model, position, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return null

      const result = await lspService.getHover(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      })

      if (!result || !result.contents || token?.isCancellationRequested) {
        return null
      }

      const contents = Array.isArray(result.contents) 
        ? result.contents 
        : [result.contents]

      const hoverContents = contents.map(content => {
        if (typeof content === 'string') {
          return { value: content }
        } else if (content.kind === 'markdown') {
          return { value: content.value, isTrusted: true }
        } else if (content.language) {
          return { 
            value: `\`\`\`${content.language}\n${content.value}\n\`\`\``,
            isTrusted: true
          }
        } else {
          return { value: content.value || content }
        }
      })

      const hover = {
        contents: hoverContents
      }

      // Add range if provided
      if (result.range) {
        hover.range = {
          startLineNumber: result.range.start.line + 1,
          startColumn: result.range.start.character + 1,
          endLineNumber: result.range.end.line + 1,
          endColumn: result.range.end.character + 1
        }
      }

      return hover
    } catch (error) {
      console.error('Error providing hover:', error)
      return null
    }
  }

  /**
   * Provide definition location
   * @param {Object} model - Monaco model
   * @param {Object} position - Position in document
   * @param {Object} token - Cancellation token
   * @returns {Promise<Array>} Definition locations
   */
  async provideDefinition(model, position, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return []

      const result = await lspService.getDefinition(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      })

      if (!result || token?.isCancellationRequested) return []

      const locations = Array.isArray(result) ? result : [result]
      
      return locations.map(location => ({
        uri: this.monaco.Uri.parse(location.uri),
        range: {
          startLineNumber: location.range.start.line + 1,
          startColumn: location.range.start.character + 1,
          endLineNumber: location.range.end.line + 1,
          endColumn: location.range.end.character + 1
        }
      }))
    } catch (error) {
      console.error('Error providing definition:', error)
      return []
    }
  }

  /**
   * Provide reference locations
   * @param {Object} model - Monaco model
   * @param {Object} position - Position in document
   * @param {Object} context - Reference context
   * @param {Object} token - Cancellation token
   * @returns {Promise<Array>} Reference locations
   */
  async provideReferences(model, position, context, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return []

      const result = await lspService.getReferences(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      })

      if (!result || token?.isCancellationRequested) return []

      return result.map(location => ({
        uri: this.monaco.Uri.parse(location.uri),
        range: {
          startLineNumber: location.range.start.line + 1,
          startColumn: location.range.start.character + 1,
          endLineNumber: location.range.end.line + 1,
          endColumn: location.range.end.character + 1
        }
      }))
    } catch (error) {
      console.error('Error providing references:', error)
      return []
    }
  }

  /**
   * Provide signature help
   * @param {Object} model - Monaco model
   * @param {Object} position - Position in document
   * @param {Object} token - Cancellation token
   * @param {Object} context - Signature help context
   * @returns {Promise<Object>} Signature help
   */
  async provideSignatureHelp(model, position, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return null

      const result = await lspService.getSignatureHelp(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      })

      if (!result || !result.signatures || token?.isCancellationRequested) {
        return null
      }

      return {
        value: {
          signatures: result.signatures.map(sig => ({
            label: sig.label,
            documentation: this.convertMarkdownString(sig.documentation),
            parameters: sig.parameters?.map(param => ({
              label: param.label,
              documentation: this.convertMarkdownString(param.documentation)
            })) || []
          })),
          activeSignature: result.activeSignature || 0,
          activeParameter: result.activeParameter || 0
        },
        dispose: () => {} // Required by Monaco
      }
    } catch (error) {
      console.error('Error providing signature help:', error)
      return null
    }
  }

  /**
   * Provide document formatting edits
   * @param {Object} model - Monaco model
   * @param {Object} options - Formatting options
   * @param {Object} token - Cancellation token
   * @returns {Promise<Array>} Text edits
   */
  async provideDocumentFormattingEdits(model, options, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return []

      const result = await lspService.formatDocument(this.activeUri, {
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces
      })

      if (!result || token?.isCancellationRequested) return []

      return result.map(edit => ({
        range: {
          startLineNumber: edit.range.start.line + 1,
          startColumn: edit.range.start.character + 1,
          endLineNumber: edit.range.end.line + 1,
          endColumn: edit.range.end.character + 1
        },
        text: edit.newText
      }))
    } catch (error) {
      console.error('Error providing formatting edits:', error)
      return []
    }
  }

  /**
   * Handle diagnostics from LSP server
   * @param {Object} params - Diagnostics parameters
   */
  handleDiagnostics(params) {
    try {
      const { uri, diagnostics } = params
      
      if (uri !== this.activeUri) return

      // Clear previous decorations
      this.diagnosticsDecorations = this.editor.deltaDecorations(
        this.diagnosticsDecorations,
        []
      )

      // Create new decorations for diagnostics
      const decorations = diagnostics.map(diagnostic => ({
        range: {
          startLineNumber: diagnostic.range.start.line + 1,
          startColumn: diagnostic.range.start.character + 1,
          endLineNumber: diagnostic.range.end.line + 1,
          endColumn: diagnostic.range.end.character + 1
        },
        options: {
          className: this.getDiagnosticClassName(diagnostic.severity),
          hoverMessage: {
            value: diagnostic.message
          },
          minimap: {
            color: this.getDiagnosticColor(diagnostic.severity),
            position: this.monaco.editor.MinimapPosition.Inline
          }
        }
      }))

      // Apply new decorations
      this.diagnosticsDecorations = this.editor.deltaDecorations(
        [],
        decorations
      )
    } catch (error) {
      console.error('Error handling diagnostics:', error)
    }
  }

  /**
   * Show message from LSP server
   * @param {Object} params - Message parameters
   */
  showMessage(params) {
    const { type, message } = params
    
    // Convert LSP message type to console method
    const logMethod = {
      1: 'error',   // Error
      2: 'warn',    // Warning
      3: 'info',    // Info
      4: 'log'      // Log
    }[type] || 'log'
    
    console[logMethod]('LSP Message:', message)
  }

  /**
   * Convert LSP completion item kind to Monaco kind
   * @param {number} lspKind - LSP completion item kind
   * @returns {number} Monaco completion item kind
   */
  convertCompletionItemKind(lspKind) {
    const kindMap = {
      1: this.monaco.languages.CompletionItemKind.Text,
      2: this.monaco.languages.CompletionItemKind.Method,
      3: this.monaco.languages.CompletionItemKind.Function,
      4: this.monaco.languages.CompletionItemKind.Constructor,
      5: this.monaco.languages.CompletionItemKind.Field,
      6: this.monaco.languages.CompletionItemKind.Variable,
      7: this.monaco.languages.CompletionItemKind.Class,
      8: this.monaco.languages.CompletionItemKind.Interface,
      9: this.monaco.languages.CompletionItemKind.Module,
      10: this.monaco.languages.CompletionItemKind.Property,
      11: this.monaco.languages.CompletionItemKind.Unit,
      12: this.monaco.languages.CompletionItemKind.Value,
      13: this.monaco.languages.CompletionItemKind.Enum,
      14: this.monaco.languages.CompletionItemKind.Keyword,
      15: this.monaco.languages.CompletionItemKind.Snippet,
      16: this.monaco.languages.CompletionItemKind.Color,
      17: this.monaco.languages.CompletionItemKind.File,
      18: this.monaco.languages.CompletionItemKind.Reference,
      19: this.monaco.languages.CompletionItemKind.Folder,
      20: this.monaco.languages.CompletionItemKind.EnumMember,
      21: this.monaco.languages.CompletionItemKind.Constant,
      22: this.monaco.languages.CompletionItemKind.Struct,
      23: this.monaco.languages.CompletionItemKind.Event,
      24: this.monaco.languages.CompletionItemKind.Operator,
      25: this.monaco.languages.CompletionItemKind.TypeParameter
    }
    
    return kindMap[lspKind] || this.monaco.languages.CompletionItemKind.Text
  }

  /**
   * Get CSS class name for diagnostic severity
   * @param {number} severity - Diagnostic severity
   * @returns {string} CSS class name
   */
  getDiagnosticClassName(severity) {
    const classMap = {
      1: 'lsp-diagnostic-error',     // Error
      2: 'lsp-diagnostic-warning',   // Warning
      3: 'lsp-diagnostic-info',      // Information
      4: 'lsp-diagnostic-hint'       // Hint
    }
    
    return classMap[severity] || 'lsp-diagnostic-info'
  }

  /**
   * Get color for diagnostic severity
   * @param {number} severity - Diagnostic severity
   * @returns {string} Color hex code
   */
  getDiagnosticColor(severity) {
    const colorMap = {
      1: '#ff0000',  // Error - Red
      2: '#ff8c00',  // Warning - Orange
      3: '#0080ff',  // Information - Blue
      4: '#00ff00'   // Hint - Green
    }
    
    return colorMap[severity] || '#0080ff'
  }

  /**
   * Get workspace root directory
   * @returns {string} Workspace root path
   */
  getWorkspaceRoot() {
    // In a real implementation, this would get the actual workspace root
    // For now, return a default path
    return '/workspace'
  }

  /**
   * Provide document range formatting edits
   * @param {Object} model - Monaco model
   * @param {Object} range - Range to format
   * @param {Object} options - Formatting options
   * @param {Object} token - Cancellation token
   * @returns {Promise<Array>} Text edits
   */
  async provideDocumentRangeFormattingEdits(model, range, options, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return []

      const result = await lspService.formatDocumentRange(this.activeUri, {
        start: {
          line: range.startLineNumber - 1,
          character: range.startColumn - 1
        },
        end: {
          line: range.endLineNumber - 1,
          character: range.endColumn - 1
        }
      }, {
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces
      })

      if (!result || token?.isCancellationRequested) return []

      return result.map(edit => ({
        range: {
          startLineNumber: edit.range.start.line + 1,
          startColumn: edit.range.start.character + 1,
          endLineNumber: edit.range.end.line + 1,
          endColumn: edit.range.end.character + 1
        },
        text: edit.newText
      }))
    } catch (error) {
      console.error('Error providing range formatting edits:', error)
      return []
    }
  }

  /**
   * Provide document symbols
   * @param {Object} model - Monaco model
   * @param {Object} token - Cancellation token
   * @returns {Promise<Array>} Document symbols
   */
  async provideDocumentSymbols(model, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return []

      const result = await lspService.getDocumentSymbols(this.activeUri)

      if (!result || token?.isCancellationRequested) return []

      return result.map(symbol => ({
        name: symbol.name,
        detail: symbol.detail || '',
        kind: this.convertSymbolKind(symbol.kind),
        range: {
          startLineNumber: symbol.range.start.line + 1,
          startColumn: symbol.range.start.character + 1,
          endLineNumber: symbol.range.end.line + 1,
          endColumn: symbol.range.end.character + 1
        },
        selectionRange: {
          startLineNumber: symbol.selectionRange.start.line + 1,
          startColumn: symbol.selectionRange.start.character + 1,
          endLineNumber: symbol.selectionRange.end.line + 1,
          endColumn: symbol.selectionRange.end.character + 1
        },
        children: symbol.children?.map(child => this.convertDocumentSymbol(child))
      }))
    } catch (error) {
      console.error('Error providing document symbols:', error)
      return []
    }
  }

  /**
   * Provide code actions
   * @param {Object} model - Monaco model
   * @param {Object} range - Range for code actions
   * @param {Object} context - Code action context
   * @param {Object} token - Cancellation token
   * @returns {Promise<Object>} Code actions
   */
  async provideCodeActions(model, range, context, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return { actions: [], dispose: () => {} }

      const result = await lspService.getCodeActions(this.activeUri, {
        start: {
          line: range.startLineNumber - 1,
          character: range.startColumn - 1
        },
        end: {
          line: range.endLineNumber - 1,
          character: range.endColumn - 1
        }
      }, {
        diagnostics: context.markers?.map(marker => ({
          range: {
            start: {
              line: marker.startLineNumber - 1,
              character: marker.startColumn - 1
            },
            end: {
              line: marker.endLineNumber - 1,
              character: marker.endColumn - 1
            }
          },
          message: marker.message,
          severity: this.convertMarkerSeverityToLSP(marker.severity)
        })) || []
      })

      if (!result || token?.isCancellationRequested) return { actions: [], dispose: () => {} }

      const actions = result.map(action => ({
        title: action.title,
        kind: action.kind,
        diagnostics: action.diagnostics,
        isPreferred: action.isPreferred,
        edit: action.edit ? this.convertWorkspaceEdit(action.edit) : undefined,
        command: action.command
      }))

      return {
        actions,
        dispose: () => {}
      }
    } catch (error) {
      console.error('Error providing code actions:', error)
      return { actions: [], dispose: () => {} }
    }
  }

  /**
   * Provide rename edits
   * @param {Object} model - Monaco model
   * @param {Object} position - Position to rename
   * @param {string} newName - New name
   * @param {Object} token - Cancellation token
   * @returns {Promise<Object>} Workspace edit
   */
  async provideRenameEdits(model, position, newName, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return null

      const result = await lspService.rename(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      }, newName)

      if (!result || token?.isCancellationRequested) return null

      return this.convertWorkspaceEdit(result)
    } catch (error) {
      console.error('Error providing rename edits:', error)
      return null
    }
  }

  /**
   * Resolve rename location
   * @param {Object} model - Monaco model
   * @param {Object} position - Position to rename
   * @param {Object} token - Cancellation token
   * @returns {Promise<Object>} Rename location
   */
  async resolveRenameLocation(model, position, token) {
    try {
      if (!this.activeUri || token?.isCancellationRequested) return null

      const result = await lspService.prepareRename(this.activeUri, {
        line: position.lineNumber - 1,
        character: position.column - 1
      })

      if (!result || token?.isCancellationRequested) return null

      if (result.range) {
        return {
          range: {
            startLineNumber: result.range.start.line + 1,
            startColumn: result.range.start.character + 1,
            endLineNumber: result.range.end.line + 1,
            endColumn: result.range.end.character + 1
          },
          text: result.placeholder || model.getValueInRange({
            startLineNumber: result.range.start.line + 1,
            startColumn: result.range.start.character + 1,
            endLineNumber: result.range.end.line + 1,
            endColumn: result.range.end.character + 1
          })
        }
      }

      return null
    } catch (error) {
      console.error('Error resolving rename location:', error)
      return null
    }
  }

  /**
   * Set up diagnostics provider for real-time error checking
   */
  setupDiagnosticsProvider() {
    // Listen for diagnostics updates
    lspService.on('diagnostics', (params) => {
      this.handleDiagnostics(params)
    })

    // Set up periodic diagnostics refresh
    this.diagnosticsInterval = setInterval(() => {
      if (this.activeUri && this.isInitialized) {
        this.requestDiagnostics()
      }
    }, 2000) // Check every 2 seconds
  }

  /**
   * Request diagnostics for current document
   */
  async requestDiagnostics() {
    try {
      if (!this.activeUri) return

      // Diagnostics are typically sent automatically by LSP servers
      // This is a placeholder for manual diagnostic requests if needed
      const result = await lspService.getDiagnostics?.(this.activeUri)
      
      if (result) {
        this.handleDiagnostics({
          uri: this.activeUri,
          diagnostics: result
        })
      }
    } catch (error) {
      console.error('Error requesting diagnostics:', error)
    }
  }

  /**
   * Convert markdown string for Monaco
   * @param {string|Object} documentation - Documentation string or object
   * @returns {Object} Monaco markdown string
   */
  convertMarkdownString(documentation) {
    if (!documentation) return undefined
    
    if (typeof documentation === 'string') {
      return { value: documentation }
    }
    
    if (documentation.kind === 'markdown') {
      return { value: documentation.value, isTrusted: true }
    }
    
    return { value: documentation.value || documentation }
  }

  /**
   * Convert LSP symbol kind to Monaco symbol kind
   * @param {number} lspKind - LSP symbol kind
   * @returns {number} Monaco symbol kind
   */
  convertSymbolKind(lspKind) {
    const kindMap = {
      1: this.monaco.languages.SymbolKind.File,
      2: this.monaco.languages.SymbolKind.Module,
      3: this.monaco.languages.SymbolKind.Namespace,
      4: this.monaco.languages.SymbolKind.Package,
      5: this.monaco.languages.SymbolKind.Class,
      6: this.monaco.languages.SymbolKind.Method,
      7: this.monaco.languages.SymbolKind.Property,
      8: this.monaco.languages.SymbolKind.Field,
      9: this.monaco.languages.SymbolKind.Constructor,
      10: this.monaco.languages.SymbolKind.Enum,
      11: this.monaco.languages.SymbolKind.Interface,
      12: this.monaco.languages.SymbolKind.Function,
      13: this.monaco.languages.SymbolKind.Variable,
      14: this.monaco.languages.SymbolKind.Constant,
      15: this.monaco.languages.SymbolKind.String,
      16: this.monaco.languages.SymbolKind.Number,
      17: this.monaco.languages.SymbolKind.Boolean,
      18: this.monaco.languages.SymbolKind.Array,
      19: this.monaco.languages.SymbolKind.Object,
      20: this.monaco.languages.SymbolKind.Key,
      21: this.monaco.languages.SymbolKind.Null,
      22: this.monaco.languages.SymbolKind.EnumMember,
      23: this.monaco.languages.SymbolKind.Struct,
      24: this.monaco.languages.SymbolKind.Event,
      25: this.monaco.languages.SymbolKind.Operator,
      26: this.monaco.languages.SymbolKind.TypeParameter
    }
    
    return kindMap[lspKind] || this.monaco.languages.SymbolKind.Variable
  }

  /**
   * Convert document symbol recursively
   * @param {Object} symbol - LSP document symbol
   * @returns {Object} Monaco document symbol
   */
  convertDocumentSymbol(symbol) {
    return {
      name: symbol.name,
      detail: symbol.detail || '',
      kind: this.convertSymbolKind(symbol.kind),
      range: {
        startLineNumber: symbol.range.start.line + 1,
        startColumn: symbol.range.start.character + 1,
        endLineNumber: symbol.range.end.line + 1,
        endColumn: symbol.range.end.character + 1
      },
      selectionRange: {
        startLineNumber: symbol.selectionRange.start.line + 1,
        startColumn: symbol.selectionRange.start.character + 1,
        endLineNumber: symbol.selectionRange.end.line + 1,
        endColumn: symbol.selectionRange.end.character + 1
      },
      children: symbol.children?.map(child => this.convertDocumentSymbol(child))
    }
  }

  /**
   * Convert Monaco marker severity to LSP diagnostic severity
   * @param {number} monacoSeverity - Monaco marker severity
   * @returns {number} LSP diagnostic severity
   */
  convertMarkerSeverityToLSP(monacoSeverity) {
    const severityMap = {
      8: 1, // Error
      4: 2, // Warning
      2: 3, // Info
      1: 4  // Hint
    }
    
    return severityMap[monacoSeverity] || 3
  }

  /**
   * Convert LSP workspace edit to Monaco workspace edit
   * @param {Object} lspEdit - LSP workspace edit
   * @returns {Object} Monaco workspace edit
   */
  convertWorkspaceEdit(lspEdit) {
    const edits = []
    
    if (lspEdit.changes) {
      for (const [uri, textEdits] of Object.entries(lspEdit.changes)) {
        textEdits.forEach(edit => {
          edits.push({
            resource: this.monaco.Uri.parse(uri),
            edit: {
              range: {
                startLineNumber: edit.range.start.line + 1,
                startColumn: edit.range.start.character + 1,
                endLineNumber: edit.range.end.line + 1,
                endColumn: edit.range.end.character + 1
              },
              text: edit.newText
            }
          })
        })
      }
    }
    
    if (lspEdit.documentChanges) {
      lspEdit.documentChanges.forEach(change => {
        if (change.textDocument) {
          change.edits.forEach(edit => {
            edits.push({
              resource: this.monaco.Uri.parse(change.textDocument.uri),
              edit: {
                range: {
                  startLineNumber: edit.range.start.line + 1,
                  startColumn: edit.range.start.character + 1,
                  endLineNumber: edit.range.end.line + 1,
                  endColumn: edit.range.end.character + 1
                },
                text: edit.newText
              }
            })
          })
        }
      })
    }
    
    return { edits }
  }

  /**
   * Dispose of resources
   */
  dispose() {
    // Clear diagnostics interval
    if (this.diagnosticsInterval) {
      clearInterval(this.diagnosticsInterval)
      this.diagnosticsInterval = null
    }

    // Dispose of Monaco providers
    this.disposables.forEach(disposable => disposable.dispose())
    this.disposables = []
    
    // Clear decorations
    if (this.editor && this.diagnosticsDecorations.length > 0) {
      this.editor.deltaDecorations(this.diagnosticsDecorations, [])
      this.diagnosticsDecorations = []
    }
    
    // Clean up LSP service
    lspService.cleanup()
    
    this.editor = null
    this.monaco = null
    this.activeUri = null
    this.activeLanguage = null
    this.isInitialized = false
  }
}

// Create singleton instance
export const monacoLSPIntegration = new MonacoLSPIntegration()
export default monacoLSPIntegration