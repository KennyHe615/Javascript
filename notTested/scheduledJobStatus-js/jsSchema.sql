CREATE TABLE [dbo].[Gen_Historical_Scheduled_Job_Status]
(
    [id]                    BIGINT IDENTITY (1, 1) NOT NULL,
    [category]              NVARCHAR(100)          NOT NULL,
    [interval]              NVARCHAR(50)           NULL,
    [page_number]           INT                    NULL,
    [is_job_completed]      TINYINT                NOT NULL,
    [is_recovery_completed] TINYINT                NOT NULL,
    [app_created_at]        DATETIMEOFFSET(0)      NOT NULL,
    [app_updated_at]        DATETIMEOFFSET(0)      NOT NULL,

    CONSTRAINT [PK_Gen_Historical_Scheduled_Job_Status] PRIMARY KEY CLUSTERED ([id] ASC, [category] ASC)
);