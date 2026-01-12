CREATE TABLE [dbo].[Gen_IVR_Attribute_STG]
(
    [conversation_id] NVARCHAR(36)      NOT NULL,
    [participant_id]  NVARCHAR(36)      NOT NULL,
    [queue_id]        NVARCHAR(36)      NOT NULL,
    [connected_time]  DATETIMEOFFSET(0) NULL,
    [end_time]        DATETIMEOFFSET(0) NULL,
    [duration]        BIGINT            NULL,
    [attribute_key]   NVARCHAR(255)     NOT NULL,
    [attribute_value] NVARCHAR(MAX)     NULL,
    [app_created_at]  DATETIMEOFFSET(0) NOT NULL,
    [app_updated_at]  DATETIMEOFFSET(0) NOT NULL,

    CONSTRAINT [PK_Gen_IVR_Attribute_STG] PRIMARY KEY CLUSTERED ([conversation_id] ASC, [participant_id] ASC, [queue_id] ASC, [attribute_key] ASC)
);