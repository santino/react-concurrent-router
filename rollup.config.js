import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import compiler from '@ampproject/rollup-plugin-closure-compiler'
import pkg from './package.json'

const configBase = {
  input: {
    createBrowserRouter: 'src/createBrowserRouter.js',
    createHashRouter: 'src/createHashRouter.js',
    createMemoryRouter: 'src/createMemoryRouter.js',
    SuspendableResource: 'src/SuspendableResource.js',
    useBeforeRouteLeave: 'src/useBeforeRouteLeave',
    useHistory: 'src/useHistory',
    useNavigation: 'src/useNavigation',
    useRouter: 'src/useRouter',
    RouterProvider: 'src/RouterProvider',
    RouteRenderer: 'src/RouteRenderer',
    Link: 'src/Link'
  },
  external: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
    /^@babel\/runtime/
  ],
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    history: 'HistoryLibrary',
    'path-to-regexp': 'pathToRegexp'
  },
  babelConfig: {
    exclude: 'node_modules/**',
    babelHelpers: 'runtime'
  }
}

const bundles = {
  cjs: [
    {
      input: 'src/index.js',
      output: {
        file: 'dist/cjs/index.js',
        format: 'cjs',
        esModule: false
      },
      external: configBase.external,
      plugins: [babel(configBase.babelConfig)]
    },
    { // minified build only used to monitor bundlesize; will not be published
      input: 'dist/cjs/index.js',
      output: {
        file: 'dist/cjs/index.min.js'
      },
      plugins: [compiler(), terser()]
    },
    {
      input: configBase.input,
      output: {
        dir: 'dist/cjs',
        entryFileNames: '[name].js',
        format: 'cjs',
        exports: 'default',
        esModule: false
      },
      external: configBase.external,
      plugins: [babel(configBase.babelConfig)]
    }
  ],
  esm: [
    {
      input: 'src/index.js',
      output: [{ file: 'dist/esm/index.js', format: 'esm' }],
      external: configBase.external,
      plugins: [babel(configBase.babelConfig)]
    },
    { // minified build only used to monitor bundlesize; will not be published
      input: 'dist/esm/index.js',
      output: {
        file: 'dist/esm/index.min.js'
      },
      external: configBase.external,
      plugins: [compiler(), terser()]
    },
    {
      input: configBase.input,
      output: { dir: 'dist/esm', entryFileNames: '[name].js', format: 'esm' },
      external: configBase.external,
      plugins: [babel(configBase.babelConfig)]
    }
  ],
  umd: [
    {
      input: 'src/index',
      output: {
        file: `dist/umd/${pkg.name}.development.js`,
        format: 'umd',
        name: 'ReactConcurrentRouter',
        globals: configBase.globals
      },
      external: Object.keys(pkg.peerDependencies),
      plugins: [
        nodeResolve(),
        babel(configBase.babelConfig),
        commonjs({ ignoreGlobal: true, include: /node_modules/ })
      ]
    },
    {
      input: 'src/index',
      output: {
        file: `dist/umd/${pkg.name}.production.min.js`,
        format: 'umd',
        name: 'ReactConcurrentRouter',
        globals: configBase.globals
      },
      external: Object.keys(pkg.peerDependencies),
      plugins: [
        nodeResolve(),
        babel(configBase.babelConfig),
        commonjs({ ignoreGlobal: true, include: /node_modules/ }),
        compiler(),
        terser()
      ]
    }
  ]
}

export default bundles[process.env.BABEL_ENV]
