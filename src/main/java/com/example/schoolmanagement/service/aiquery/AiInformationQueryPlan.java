package com.example.schoolmanagement.service.aiquery;

import java.util.LinkedHashMap;
import java.util.Map;

public class AiInformationQueryPlan {
    private String entity;
    private String operation;
    private Map<String, String> filters = new LinkedHashMap<>();
    private String legacyAction;
    private Double confidence;

    public String getEntity() {
        return entity;
    }

    public void setEntity(String entity) {
        this.entity = entity;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public Map<String, String> getFilters() {
        return filters;
    }

    public void setFilters(Map<String, String> filters) {
        this.filters = filters == null ? new LinkedHashMap<>() : filters;
    }

    public String getLegacyAction() {
        return legacyAction;
    }

    public void setLegacyAction(String legacyAction) {
        this.legacyAction = legacyAction;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }
}
