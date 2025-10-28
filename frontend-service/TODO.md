# Frontend Integration TODO

Scope: Make the frontend (NodePort 30001) work with the backend gateway API (NodePort 30002) without CORS issues by reverse proxying via Nginx and updating frontend API calls.

Progress Legend:
- [ ] Pending
- [x] Done

## Tasks

1) Nginx reverse proxy for API
- [ ] Add nginx.conf to proxy /api/* to http://gateway:8080 inside the cluster
- [ ] Keep static files served from /usr/share/nginx/html

2) Frontend code updates to use relative API paths
- [ ] Update src/components/Login.jsx to call /api/login (POST Basic Auth)
- [ ] Update src/components/Upload.jsx to call /api/upload (POST with Bearer token)
- [ ] Update src/components/Status.jsx to call /api/status?fid=... (GET with Bearer token)
- [ ] Update src/components/Download.jsx to call /api/download?fid=... (GET with Bearer token)

3) Dockerfile update
- [ ] Copy nginx.conf into /etc/nginx/conf.d/default.conf
- [ ] Ensure Nginx serves built dist

4) Build and deployment
- [ ] npm run build (produce dist/)
- [ ] Build Docker image (tag: <ECR_URI>/frontend:v2)
- [ ] Push Docker image to ECR
- [ ] Update Kubernetes Deployment to new image and rollout

5) Validation (from browser at NodePort 30001)
- [ ] Load app and open console (verify no CORS errors)
- [ ] Login succeeds (token stored in localStorage)
- [ ] Upload MP4 file succeeds (alerts and/or navigations work)
- [ ] Status polling works and transitions to completed
- [ ] Download returns MP3 blob and downloads successfully

## Notes

- Gateway already exposes:
  - POST /login
  - POST /upload
  - GET /status?fid=...
  - GET /download?fid=...
- Reverse proxying to http://gateway:8080 avoids cross-origin calls and CORS.
- Vite envs are baked at build time; using relative /api/* avoids rebuilds just to change backend URL.
- If external testing is needed, ensure NodePort 30001 is accessible and cluster DNS resolves "gateway" service internally.

## Commands (to run later)

- Build frontend dist:
  - npm ci
  - npm run build

- Docker build/push (example placeholders):
  - docker build -t <ECR_URI>/frontend:v2 .
  - docker push <ECR_URI>/frontend:v2

- Kubernetes rollout (example placeholders):
  - kubectl set image deployment/frontend frontend=<ECR_URI>/frontend:v2
  - kubectl rollout status deployment/frontend
