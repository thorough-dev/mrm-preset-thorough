// @ts-check
const { uniq, flatten } = require('lodash');
const { packageJson, install, yaml, getExtsFromCommand } = require('mrm-core');

const packages = { prettier: '>=2' };

const defaultOverrides = [];

const defaultPrettierOptions = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  jsxBracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
};

const thoroughPrettierOptions = {
  singleQuote: true,
  printWidth: 90,
};

function getPattern(pkg) {
  // We want to keep any extra extensions
  const prettierExts = getExtsFromCommand(pkg.getScript('format'));

  // ESLint extensions > TypeScript (.ts,.tsx) > .js
  const eslintExts = getExtsFromCommand(pkg.getScript('lint'), 'ext');
  const typeScriptExts = pkg.get('devDependencies.typescript') && ['ts', 'tsx'];
  const scriptExts = eslintExts || typeScriptExts || ['js'];

  // Stylelint extensions > .css
  const stylelintExts = getExtsFromCommand(pkg.getScript('lint:css'));
  const styleExts = stylelintExts || ['css'];

  const exts = uniq(
    flatten([prettierExts, scriptExts, styleExts, ['md']]).filter(Boolean)
  );

  return `**/*.{${exts.join(',')}}`;
}

// Remove options that have the same values as Prettier defaults
function removeDefaultOptions(options) {
  const newOptions = { ...options };

  for (const option in newOptions) {
    if (newOptions[option] === defaultPrettierOptions[option]) {
      delete newOptions[option];
    }
  }

  return newOptions;
}

module.exports = function task({ prettierOptions, prettierOverrides }) {
  const overrides = prettierOverrides || defaultOverrides;

  const options = removeDefaultOptions({
    ...prettierOptions,
    ...thoroughPrettierOptions,
  });

  // .prettierrc.yml
  const prettierrc = yaml('.prettierrc.yml');

  // Get existing overrides and remove the ones we're going to add
  const overridePatterns = overrides.map((override) => override.files);
  const oldOverrides = prettierrc
    .get('overrides', [])
    .filter((override) => !overridePatterns.includes(override.files));

  // Merge existing overrides with new ones
  const newOverrides = [...oldOverrides, ...overrides];

  // Update options and save
  prettierrc
    .merge(options)
    // unset/set to make sure overrides are always placed after options
    .unset('overrides')
    .set('overrides', newOverrides)
    .save();

  // TODO(zachary) For now, don't add an npm task

  // const pkg = packageJson();
  // const pattern =
  //   prettierPattern === 'auto' ? getPattern(pkg) : prettierPattern;

  // pkg
  //   // Add format script
  //   // Double quotes are essential to support Windows:
  //   // https://github.com/prettier/prettier/issues/4086#issuecomment-370228517
  //   .setScript('format', `prettier --loglevel warn --write "${pattern}"`)
  //   // Add pretest script
  //   .appendScript('posttest', 'npm run format')
  //   .save();

  // Dependencies
  install(packages);
};

module.exports.description = `Adds Prettier with Thorough's style.`;

module.exports.parameters = {
  prettierPattern: {
    type: 'input',
    message: 'Enter Prettier file glob pattern',
    default: 'auto',
  },
  prettierOptions: { type: 'config' },
  prettierOverrides: { type: 'config' },
};
