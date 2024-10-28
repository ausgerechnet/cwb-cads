# CADS/Spheroscope Frontend

## Project setup

1. Ensure that the correct node version is installed as specified in the `.nvmrc` file. If you use `nvm`, you can run: `nvm use` to switch to the correct version.
2. Install the dependencies:
   ```bash
   npm install
  ```

## Development

### Running the development server

To start the development server, run:

```bash
npm run dev
```

To run the spheroscope frontend in production mode, run:

```bash
npm run dev:spheroscope
```

### Project structure

The project is separated into three [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces):

* `mmda`: Contains the MMDA frontend.
* `spheroscope`: Contains the Spheroscope frontend.
* `shared`: Contains shared code between the two frontends.