FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 
ENV PYTHONUNBUFFERED=1 
ENV POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN pip install --no-cache-dir poetry

# Copy only dependency files (important for caching)
COPY pyproject.toml poetry.lock* /app/

# Install Python deps
RUN poetry install --no-root --no-interaction --no-ansi

# Install system deps
RUN apt-get update && apt-get install -y \
    libevent-2.1-7 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers (cached unless deps change)
RUN playwright install chromium

# Copy project files AFTER everything
COPY . /app/