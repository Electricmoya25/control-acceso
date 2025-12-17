# Guía para aplicar cambios en GitHub

Estos pasos te ayudan a que los cambios de la aplicación de control de acceso lleguen correctamente a GitHub y queden listos para revisión o despliegue.

## Requisitos previos

- Tener configurado Git en tu máquina y acceso de escritura al repositorio.
- Node 20+ y npm instalados.
- Variables de entorno de Firebase definidas (por ejemplo, en `.env` o en tu proveedor de CI) según las claves del proyecto.

## Flujo recomendado

1. **Instala dependencias** (solo la primera vez o cuando cambien):

   ```bash
   npm install
   ```

2. **Verifica que todo compile** antes de subir los cambios:

   ```bash
   npm run build
   ```

3. **Prepara y revisa el commit**:

   ```bash
   git status
   git add .
   git commit -m "Describe brevemente el cambio"
   ```

   Usa `git status` para confirmar que solo se incluyen los archivos deseados.

4. **Envía la rama a GitHub**:

   ```bash
   git push origin <nombre-de-tu-rama>
   ```

5. **Crea un Pull Request** en GitHub desde esa rama hacia la rama principal (por ejemplo, `main` o `work`). Incluye un resumen del cambio y evidencia de pruebas (`npm run build`).

6. **Espera la revisión y haz merge** cuando el PR esté aprobado. Si usas despliegue automático, verifica que el pipeline (CI/CD) se ejecute sin errores tras el merge.

## Consejos

- Haz commits pequeños y descriptivos para facilitar la revisión.
- Si añades dependencias nuevas, incluye la razón en la descripción del PR.
- Para cambios de UI, agrega capturas de pantalla en el PR para que los revisores vean el impacto visual.
- Para despliegues en Cloud Run usa el script `gcp-build` (se ejecuta automáticamente en los buildpacks de Google) para
  generar `dist` antes de iniciar el contenedor.
- `npm start` sirve la app ya compilada en `PORT` (por defecto 8080) con `--strictPort`, así que la revisión de salud de
  Cloud Run siempre encontrará el servicio escuchando en el puerto esperado.

