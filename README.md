# Guía para aplicar cambios en GitHub

Estos pasos te ayudan a que los cambios de la aplicación de control de acceso lleguen correctamente a GitHub y queden listos para revisión o despliegue.

## Requisitos previos

- Tener configurado Git en tu máquina y acceso de escritura al repositorio.
- Node 20+ y npm instalados.
- Variables de entorno de Firebase definidas (por ejemplo, en `.env` o en tu proveedor de CI) según las claves del proyecto.

## Flujo recomendado

1. **Instala dependencias** (solo la primera vez o cuando cambien):

  bash
  npm install

