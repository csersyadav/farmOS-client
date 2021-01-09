import Vue from 'vue';
import mapVuex from '../core/mixins/mapVuex';

// A recursive function for initializing a field module's route components and
// child components, as well as adding the proper module meta tags.
const createRoutes = (modName, routes, store) => (
  !Array.isArray(routes) ? undefined : routes.map(({
    path,
    name,
    component,
    components,
    children,
    meta,
    params,
    props,
    query,
  }) => ({
    path,
    name,
    component: typeof component !== 'object'
      ? undefined
      : Vue.component(component.name, { ...component, mixins: [mapVuex] }),
    components: typeof components !== 'object'
      ? undefined
      : Object.entries(components).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: Vue.component(val.name, { ...val, mixins: [mapVuex] }),
      }), {}),
    children: createRoutes(modName, children),
    meta: { ...meta, module: modName },
    params,
    props,
    query,
    beforeEnter(to, from, next) {
      if (store && store.state.shell.currentModule !== modName) {
        store.commit('setCurrentModule', modName);
      }
      next();
    },
  }))
);

// Reroutes / to Home if there are modules, otherwise Tasks.
export const setRootRoute = (modules, router) => {
  const homeRouteExists = router.resolve('/').route.matched.length > 0;
  if (!homeRouteExists) {
    if (!modules || modules.length < 1) {
      router.addRoutes([
        {
          path: '/',
          redirect: '/tasks',
        },
      ]);
    } else {
      router.addRoutes([
        {
          path: '/',
          redirect: '/home',
        },
      ]);
    }
    // Add a wildcard route so any unfound routes redirect to home.
    router.addRoutes([
      {
        path: '*',
        redirect: '/',
      },
    ]);
  }
};

// Factory function that returns an object which complies with the Vue plugin
// spec: https://vuejs.org/v2/guide/plugins.html#Writing-a-Plugin.
export const createFieldModule = (modConfig, deps) => {
  const {
    drawer,
    widget,
    filters,
    name,
    routes,
    label,
  } = modConfig;
  const {
    commit,
    router,
  } = deps;
  commit('updateModule', {
    name,
    label,
    filters,
    routes: routes.map(r => ({ name: r.name, path: r.path })),
  });
  Vue.component(
    `${name}-drawer-items`,
    { ...drawer, name: `${name}-drawer-items` },
  );
  Vue.component(
    `${name}-widget`,
    { ...widget, name: `${name}-widget`, mixins: [mapVuex] },
  );
  router.addRoutes(createRoutes(name, routes, deps));
};

export const loadFieldModule = (module) => {
  const script = document.createElement('script');
  script.src = `${localStorage.getItem('host')}/${module.js}`;
  script.id = `field-module-${module.name}`;
  script.type = 'module';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    // eslint-disable-next-line no-console
    console.log(`${module.label} loaded successfully!`);
  };
  script.onerror = () => {
    // eslint-disable-next-line no-console
    console.error(`Error installing ${module.label}.`);
  };
  document.body.appendChild(script);
};
