// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

/** @type {import('eslint').Linter.Config[]} */
const noFormattingRules = {
  // Nuxt config key order (cosmetic)
  'nuxt/nuxt-config-keys-order': 'off',

  // Vue template layout / whitespace
  'vue/html-closing-bracket-newline': 'off',
  'vue/html-closing-bracket-spacing': 'off',
  'vue/html-indent': 'off',
  'vue/html-quotes': 'off',
  'vue/html-self-closing': 'off',
  'vue/max-attributes-per-line': 'off',
  'vue/first-attribute-linebreak': 'off',
  'vue/multiline-html-element-content-newline': 'off',
  'vue/singleline-html-element-content-newline': 'off',
  'vue/mustache-interpolation-spacing': 'off',
  'vue/attributes-order': 'off',
  'vue/component-tags-order': 'off',
  'vue/block-order': 'off',
  'vue/padding-line-between-blocks': 'off',
  'vue/new-line-between-multi-line-property': 'off',

  // JS/TS style (in case any preset still enables them)
  'no-trailing-spaces': 'off',
  'no-multiple-empty-lines': 'off',
  'eol-last': 'off',
  'comma-dangle': 'off',
  '@stylistic/comma-dangle': 'off',
  '@typescript-eslint/comma-dangle': 'off',
  'style/comma-dangle': 'off',
  'quotes': 'off',
  'semi': 'off',
  'indent': 'off',
  'object-curly-spacing': 'off',
  'array-bracket-spacing': 'off',
  'key-spacing': 'off',
  'space-before-function-paren': 'off',
  'operator-linebreak': 'off',

  // Non-syntax: file still runs
  '@typescript-eslint/no-unused-vars': 'off',
  'no-unused-vars': 'off',
  'vue/no-unused-vars': 'off',
  'import/first': 'off',
  'import/order': 'off',
  'import/no-duplicates': 'off',
  'no-useless-escape': 'off',
  'vue/no-v-html': 'off',
  'vue/no-multiple-template-root': 'off'
}

export default withNuxt(
  {
    name: 'bread-butter/no-formatting',
    rules: noFormattingRules
  }
)
