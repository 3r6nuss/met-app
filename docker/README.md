# Deployment Instructions for Portainer

This folder contains the configuration to deploy the MET application using Docker/Portainer.

## Prerequisites

- Docker and Docker Compose installed (or Portainer).

## Deployment Steps

1.  **Copy Files**: Ensure the entire project directory is accessible to the build context.
2.  **Data Persistence**: The `docker-compose.yml` maps JSON data files to a local `data` directory inside this `docker` folder.
    *   **Important**: You must create the `data` folder inside `docker` and copy your existing `.json` files into it BEFORE starting the container, or the container will create empty directories instead of files.
    *   Example structure:
        ```
        /path/to/project/
        ├── docker/
        │   ├── docker-compose.yml
        │   ├── Dockerfile
        │   └── data/
        │       ├── inventory.json
        │       ├── logs.json
        │       ├── employees.json
        │       ├── verifications.json
        │       └── prices.json
        ├── src/
        ├── server.js
        └── ...
        ```
3.  **Run**:
    *   Navigate to the `docker` directory.
    *   Run `docker-compose up -d --build`.

## Portainer Stack

If deploying as a Stack in Portainer:

1.  You may need to adjust the build context or use a pre-built image if you cannot mount the source code directly.
2.  Ideally, build the image locally and push to a registry, or point Portainer to the Git repository.
