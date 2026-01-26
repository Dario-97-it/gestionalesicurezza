export const onRequest: PagesFunction = async ({ next }) => {
  return await next();
};
