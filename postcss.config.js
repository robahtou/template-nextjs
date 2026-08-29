import path from 'node:path';


function resolveAlias(id, _basedir, importOptions) {
  const { root } = importOptions;

  if (id.startsWith('@Styles/')) {
    return path.resolve(root, 'assets/styles', id.slice('@Styles/'.length));
  }
}


export default {
  plugins: [
    ['postcss-import', {
      root            : 'src',
      path            : ['app', 'assets', 'components'],
      skipDuplicates  : true,
      resolve         : resolveAlias
    }],
    'postcss-nesting',
    'postcss-custom-media',
    'postcss-media-minmax',
    'autoprefixer'
  ]
};
