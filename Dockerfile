FROM python:3.11-slim

WORKDIR /app

# copia os arquivos estáticos (index.html, app.js, style.css)
COPY . .

# serve a interface na porta 8080
EXPOSE 8080

CMD ["python", "-m", "http.server", "8080"]
