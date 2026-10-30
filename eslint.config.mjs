import withNuxt from './.nuxt/eslint.config.mjs'

const noComments = {
  meta: {
    type: 'suggestion',
    messages: {
      forbidden: 'Comments are not allowed in source files. Explain intent in the commit message.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Shebang') continue
          context.report({ loc: comment.loc, messageId: 'forbidden' })
        }
      },
    }
  },
}

export default withNuxt({
  plugins: {
    local: { rules: { 'no-comments': noComments } },
  },
  rules: {
    'local/no-comments': 'error',
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    'vue/html-self-closing': 'off',
  },
})
