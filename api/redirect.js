export default (req) => Response.redirect(new URL('./echo', req.url), 307);
