package com.jumpstart.roadmap;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoadmapControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerAndGetToken(String email) throws Exception {
        var body = """
                {"name":"Test User","email":"%s","password":"Password123!","role":"STUDENT"}
                """.formatted(email);

        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("accessToken").asText();
    }

    @Test
    void createListAndFetchARoadmap() throws Exception {
        String token = registerAndGetToken("roadmap-owner@example.com");

        var createBody = """
                {"title":"Backend Systems","description":"From HTTP to distributed systems","tag":"Engineering","colorTheme":"MOSS"}
                """;

        String createResponse = mockMvc.perform(post("/api/roadmaps")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Backend Systems"))
                .andExpect(jsonPath("$.progressPercent").value(0))
                .andReturn().getResponse().getContentAsString();

        long roadmapId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/roadmaps").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.totalItems").value(1));

        mockMvc.perform(get("/api/roadmaps/" + roadmapId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tag").value("Engineering"));
    }

    @Test
    void aUserCannotAccessAnotherUsersRoadmap() throws Exception {
        String ownerToken = registerAndGetToken("owner2@example.com");
        String intruderToken = registerAndGetToken("intruder@example.com");

        var createBody = """
                {"title":"Private Roadmap","description":"desc","tag":"Engineering","colorTheme":"EMBER"}
                """;

        String createResponse = mockMvc.perform(post("/api/roadmaps")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long roadmapId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/roadmaps/" + roadmapId).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void creatingARoadmapWithoutATitleFailsValidation() throws Exception {
        String token = registerAndGetToken("validation@example.com");

        var invalidBody = """
                {"title":"","description":"desc"}
                """;

        mockMvc.perform(post("/api/roadmaps")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
