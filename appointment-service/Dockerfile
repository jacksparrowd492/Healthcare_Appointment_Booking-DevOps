FROM python:3.10-slim AS builder
WORKDIR /app
COPY . .
RUN pip install --user flask pymongo PyJWT flask-cors

FROM python:3.10-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 5001
CMD ["python", "app.py"]