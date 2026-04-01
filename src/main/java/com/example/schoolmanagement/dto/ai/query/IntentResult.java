package com.example.schoolmanagement.dto.ai.query;

import java.util.LinkedHashMap;
import java.util.Map;

public class IntentResult {
    private String intent;
    private Double confidence;
    private Map<String, String> entities = new LinkedHashMap<>();

    public IntentResult() {
    }

    public IntentResult(String intent, Double confidence, Map<String, String> entities) {
        this.intent = intent;
        this.confidence = confidence;
        if (entities != null) this.entities = entities;
    }

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public Map<String, String> getEntities() {
        return entities;
    }

    public void setEntities(Map<String, String> entities) {
        this.entities = entities;
    }
}

