FROM python:3.11-slim

WORKDIR /app

# Install required system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install poetry package manager
RUN pip install --no-cache-dir poetry

# Copy dependency specifications
COPY pyproject.toml /app/

# Disable virtualenv inside docker container and install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copy application source code
COPY . /app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]