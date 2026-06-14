FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
RUN echo "$APP_VERSION" > /app/VERSION
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
