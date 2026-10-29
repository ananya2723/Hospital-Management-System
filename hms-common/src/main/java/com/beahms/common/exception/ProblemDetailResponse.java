package com.beahms.common.exception;

import java.time.Instant;

public class ProblemDetailResponse {
    private String type = "about:blank";
    private String title;
    private int status;
    private String detail;
    private String traceId;
    private Instant timestamp = Instant.now();

    public ProblemDetailResponse() {
    }

    public ProblemDetailResponse(String type, String title, int status, String detail, String traceId, Instant timestamp) {
        this.type = type != null ? type : "about:blank";
        this.title = title;
        this.status = status;
        this.detail = detail;
        this.traceId = traceId;
        this.timestamp = timestamp != null ? timestamp : Instant.now();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String type = "about:blank";
        private String title;
        private int status;
        private String detail;
        private String traceId;
        private Instant timestamp = Instant.now();

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder status(int status) {
            this.status = status;
            return this;
        }

        public Builder detail(String detail) {
            this.detail = detail;
            return this;
        }

        public Builder traceId(String traceId) {
            this.traceId = traceId;
            return this;
        }

        public Builder timestamp(Instant timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public ProblemDetailResponse build() {
            return new ProblemDetailResponse(type, title, status, detail, traceId, timestamp);
        }
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
