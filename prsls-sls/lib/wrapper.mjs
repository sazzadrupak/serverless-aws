// if there are a number of middlewares that you always want to apply, you might create a wrapper like this.

// module.exports = f => {
//   return middy(f)
//     .use(middleware1({ return }))
//     .use(middleware2({ ... }))
//     .use(middleware3({ ... }))
// }

// and then apply them to your function handlers like this:
// import wrap from '../lib/wrapper.mjs'
// ...
// export const handler = wrap(async (event, context) => {
//   ...
// })
