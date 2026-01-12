CREATE TABLE [dbo].[Gen_Conversation_Aggregate_STG]
(
    [queue_id]                   NVARCHAR(36)      NOT NULL,
    [media_type]                 NVARCHAR(11)      NOT NULL,
    [requested_routing_skill_id] NVARCHAR(36)      NOT NULL,
    [wrap_up_code]               NVARCHAR(255)     NOT NULL,
    [start_time]                 DATETIMEOFFSET(0) NOT NULL,
    [end_time]                   DATETIMEOFFSET(0) NULL,
    [metric]                     NVARCHAR(23)      NOT NULL,
    [stat]                       NVARCHAR(50)      NOT NULL,
    [value]                      NVARCHAR(50)      NOT NULL,
    [app_created_at]             DATETIMEOFFSET(0) NOT NULL,
    [app_updated_at]             DATETIMEOFFSET(0) NOT NULL,

    CONSTRAINT [PK_Gen_Conversation_Aggregate_STG] PRIMARY KEY ([queue_id], [media_type],
                                                                [requested_routing_skill_id],
                                                                [wrap_up_code], [start_time], [metric],
                                                                [stat])
);


CREATE NONCLUSTERED INDEX IX_Gen_Conversation_Aggregate_STG_app_updated_at
    ON [dbo].[Gen_Conversation_Aggregate_STG] ([app_updated_at]);