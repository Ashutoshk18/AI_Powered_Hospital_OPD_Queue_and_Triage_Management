# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# services/ml/Dockerfile
# Python FastAPI ML inference service
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.13-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and model artifact
COPY app/ ./app/
COPY artifacts/ ./artifacts/

# Expose the FastAPI port
EXPOSE 8000

# Start uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
