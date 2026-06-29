package com.jumpstart.dashboard;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
        int activeRoadmaps,
        int totalTopics,
        int completedTopics,
        int totalProjects,
        int completedProjects,
        double totalStudyHours,
        double weekStudyHours,
        int currentStreak,
        int longestStreak,
        int goalsOnTrack,
        int totalGoals,
        int plannedCerts,
        int inProgressCerts,
        int completedCerts,
        List<StudyDay> activityHeatmap,
        List<StudyDay> weeklyHours,
        List<RoadmapProgress> roadmapProgress,
        List<RecentActivity> recentActivity
) {
    public record StudyDay(LocalDate date, double hours, int sessions) {}
    public record RoadmapProgress(Long id, String title, int progressPercent, int topicCount, String colorTheme) {}
    public record RecentActivity(String type, String title, String subtitle, String timestamp) {}
}
