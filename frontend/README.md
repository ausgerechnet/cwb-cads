# CADS/Spheroscope Frontend

* [Project setup](#project-setup)
* [Tech Stack](#tech-stack)
* [Development](#development)
  * [Running the development server](#running-the-development-server)
* [Project structure](#project-structure)
  * [Shared Workspace](#shared-workspace)
    * [API Client](#api-client)
    * [Queries](#queries)
    * [Components](#components)
    * [Lib](#lib)
  * [MMDA/Spheroscope Workspaces](#mmdaspheroscope-workspaces)
    * [Components](#components-1)
    * [Routes](#routes)
      * [Code Splitting](#code-splitting)
      * [Data Loading](#data-loading)
      * [Search Params](#search-params)
      * [Example Route](#example-route)

## Project setup

1. Ensure that the correct [node.js](https://nodejs.org/) version is installed as specified in the `.nvmrc` file. If you use [nvm (node version manager)](https://github.com/nvm-sh/nvm), you can run: `nvm use` to switch to the correct version.
2. Install the dependencies:
   ```bash
   npm install
   ```

## Tech Stack

Quick overview of the tech stack used in this project:

* [TypeScript](https://www.typescriptlang.org/)
* [React](https://reactjs.org/)
* [Vite](https://vitejs.dev/) as a build tool
* [Tailwind CSS](https://tailwindcss.com/) for styling
* [Zod](https://zod.dev) for runtime type validation
* [Tanstack Query](https://tanstack.com/) for async state management
* [Tanstack Router](https://tanstack.com/) for routing
* [Tanstack Table](https://tanstack.com/table/latest) for tables (Why, yes, I do like Tanner Linsley's great libraries!)
* [shadcn/ui](https://ui.shadcn.com/) for component generation
* [openapi-zod-client](https://github.com/astahmer/openapi-zod-client) for generating an API client from the OpenAPI specification

## Development

### Running the development server

To start the CADS frontend development server, run:

```bash
npm run dev
```

To run the spheroscope frontend development server, run:

```bash
npm run dev:spheroscope
```

## Project structure

The project is separated into three [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces):

* `shared`: Contains shared code between the two frontends.
* `mmda`: Contains the MMDA frontend.
* `spheroscope`: Contains the Spheroscope frontend.

### Shared Workspace

The shared workspace contains shared code between the two frontends.
 
#### API Client

In `api-client` you can, unsurprisingly, find the API client.  
It is automatically generated from the OpenAPI specification. Using [openapi-zod-client](https://github.com/astahmer/openapi-zod-client) it creates an [axios client](https://github.com/axios/axios) with type-safe request and response types that are validated during runtime with [zod](https://zod.dev). To run the generation, you can use the npm script `generate-client` either from the root directory or from the `shared` directory:

```bash
npm run generate-client
```

**Do not** edit the automatically generated `__generated__client.ts` file directly!

By default, it uses `/api` as the base URL. To change it, you can set the environment variable `VITE_API_URL`.  
The development servers automatically set up a proxy to the backend via `/api`. You can configure this in the respective `vite.config.ts` files.

#### Queries

The API client is mostly used in conjunction with the excellent [Tanstack Query](https://tanstack.com/) library.

The query client is set up in [query-client.ts](shared/queries/query-client.ts).

The queries themselves are defined in [common-queries.ts](shared/queries/common-queries.ts), [mmda-queries.ts](shared/queries/mmda-queries.ts) and [spheroscope-queries.ts](shared/queries/spheroscope-queries.ts), sorted by responsibility. Here we also define the relationships between those queries, i.e. if a mutation invalidates a query.

To use any query, just import it from `@cads/shared/queries` and use it via the usual hooks or directly via the query client:

* [useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery): To run queries that merely fetch data. 
* [useMutation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation): To run mutations, e.g. API calls that change data.
* [useSuspenseQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useSuspenseQuery): Like `useQuery`, but `data` is guaranteed to be defined. You should use this in conjunction with the [route's loader](https://tanstack.com/router/v1/docs/framework/react/guide/data-loading).

#### Components

Shared React components are located in the `components` directory. They're generally split into two categories:

* `components/ui`
  These are purely presentational components that are used in multiple places. They're usually created via [shadcn/ui](https://ui.shadcn.com/).
  You can easily bootstrap new components from shadcn/ui by running:
  ```bash
  npm run create-component
  ``` 
* `components/`
  These are more complex components that might even contain business logic.

#### Lib

The `lib` directory contains small utility functions that are used in multiple places.

### MMDA/Spheroscope Workspaces

These workspaces contain the respective frontend code. They're structured similarly.

#### Components

The `components` directory contains the React components that are specific to the respective frontend. Whenever you create a new component, consider whether it should be shared between the two frontends. If so, create it in the `shared` workspace.

#### Routes

We're using [Tanstack Router](https://tanstack.com/router/v1) for routing. For maximum convenience we use [file based routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing).

##### Code Splitting

If a route contains a lot of components or relies on heavy dependencies, you might want to lazy load this route. That can be done by using two files for that route. One named `route-name.tsx` and one `route-name.lazy.tsx`.

Tipp: If you create components that are only used in a single route, keep them collocated with the route instead of putting them in the `components` directory.

##### Data Loading

To load data for a route, you can use the `loader` property of the route. This function is called before the route is rendered and can be used to fetch data. The route will not be rendered until the loader has resolved.

It's a good idea to use the `QueryClient` to load the data. This way you can use `useSuspenseQuery` in your components to ensure that the data is immediately available. 

##### Search Params

Router offers a way to validate search params. This ensures that the search params are completely typesafe. The best way to do this is to take advantage of the [zod](https://zod.dev) library. 

##### Example Route

`my-route.tsx`:

```tsx
import { createFileRoute } from '@tanstack/router'
import { myRouteData } from '@cads/shared/queries'
import { z } from 'zod'

export const Route = createFileRoute('/my-route')({
  // We can define whatever data needs to be loaded for this route
  loader: () => {
    return queryClient.ensureQueryData(myRouteData)
  },
  // We can (and should) also validate the search params
  // `zod` is a great library for that!
  // Tipp: It very often makes sense to put the application state in the search params instead of keeping it within JavaScript land -- use the features the web platform gives you!
  validateSearch: z.object({
    pageIndex: z.number().int().min(0).catch(0),
    pageSize: z.number().int().min(1).catch(10),
  }),
})
```

`my-route.lazy.tsx`:

```tsx
import { createLazyFileRoute } from '@tanstack/router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { myRouteData } from '@cads/shared/queries'

export const Route = createLazyFileRoute('/my-route')({
  // You can define different components for different states 
  component: MyRouteComponent,
  errorComponent: ErrorComponent,
})

function MyRouteComponent() {
  const data = useSuspenseQuery(myRouteData)

  return <div>{data.someContent}</div>
}

function ErrorComponent() {
  return <div>Something went wrong</div>
}
```

