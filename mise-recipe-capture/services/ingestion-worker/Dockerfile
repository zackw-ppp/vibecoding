FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TEMP_ROOT=/tmp/mise-ingestion

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates ffmpeg tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system worker \
    && useradd --system --gid worker --home-dir /app --create-home worker \
    && install --directory --owner worker --group worker "${TEMP_ROOT}"

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src

RUN python -m pip install --no-cache-dir .

USER worker
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health/live', timeout=2)"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "recipe_worker.app:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
