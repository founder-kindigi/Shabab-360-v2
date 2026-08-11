-- One group has one student-attendance session per Pakistan calendar day.
CREATE UNIQUE INDEX "attendance_events_groupId_eventDate_key" ON "attendance_events"("groupId", "eventDate");
