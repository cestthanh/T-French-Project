# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src
COPY backend/TFrench.API/TFrench.API.csproj backend/TFrench.API/
RUN dotnet restore backend/TFrench.API/TFrench.API.csproj
COPY backend/TFrench.API/ backend/TFrench.API/
RUN dotnet publish backend/TFrench.API/TFrench.API.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true \
    ConnectionStrings__DefaultConnection="Data Source=/data/tfrench.db" \
    FileStorage__RootPath=/data/uploads

COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /src/frontend/dist/frontend/browser ./wwwroot

RUN mkdir -p /data/uploads && chown -R "$APP_UID:$APP_UID" /app /data
USER $APP_UID

EXPOSE 8080
ENTRYPOINT ["dotnet", "TFrench.API.dll"]
