FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt

# Copy application code
COPY . .

# Expose port (Docker Compose overrides this, but good practice)
# The specific port exposure will be handled by run.py + docker-compose mapping
EXPOSE 8000 

# Run the application
CMD ["python", "run.py"]
