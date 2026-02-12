FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy requirements first (better caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose Flask port
EXPOSE 5000

# Run with production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
