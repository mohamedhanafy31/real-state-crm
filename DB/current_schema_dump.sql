--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4 (Debian 15.4-2.pgdg120+1)
-- Dumped by pg_dump version 15.4 (Debian 15.4-2.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: update_broker_session_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_broker_session_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


--
-- Name: update_embedding_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_embedding_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    area_id character varying(21) NOT NULL
);


--
-- Name: areas_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas_embeddings (
    area_id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    embedding public.vector(1024),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    embedding_en public.vector(1024),
    embedding_ar public.vector(1024)
);


--
-- Name: TABLE areas_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.areas_embeddings IS 'Pre-computed embeddings for areas for fast semantic search';


--
-- Name: broker_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broker_applications (
    applicant_phone character varying(50) NOT NULL,
    applicant_name character varying(255) NOT NULL,
    applicant_email character varying(255),
    password_hash character varying(255) NOT NULL,
    requested_area_ids text,
    status character varying(30) DEFAULT 'pending_interview'::character varying NOT NULL,
    interview_score double precision,
    interview_result character varying(20),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    interview_started_at timestamp without time zone,
    interview_completed_at timestamp without time zone,
    notes text,
    application_id character varying(21) NOT NULL,
    converted_user_id character varying(21)
);


--
-- Name: broker_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broker_areas (
    broker_id character varying(21) NOT NULL,
    area_id character varying(21) NOT NULL
);


--
-- Name: broker_chatbot_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broker_chatbot_sessions (
    session_id integer NOT NULL,
    broker_id character varying(21),
    request_id character varying(21),
    session_state jsonb,
    last_analysis jsonb,
    last_strategy jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE broker_chatbot_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.broker_chatbot_sessions IS 'Stores session state for broker chatbot interactions';


--
-- Name: COLUMN broker_chatbot_sessions.session_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.broker_chatbot_sessions.session_state IS 'LangGraph conversation state JSON';


--
-- Name: COLUMN broker_chatbot_sessions.last_analysis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.broker_chatbot_sessions.last_analysis IS 'Cached client personality analysis';


--
-- Name: COLUMN broker_chatbot_sessions.last_strategy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.broker_chatbot_sessions.last_strategy IS 'Cached strategy recommendations';


--
-- Name: broker_chatbot_sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.broker_chatbot_sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: broker_chatbot_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.broker_chatbot_sessions_session_id_seq OWNED BY public.broker_chatbot_sessions.session_id;


--
-- Name: brokers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brokers (
    overall_rate double precision DEFAULT 0 NOT NULL,
    response_speed_score double precision DEFAULT 0 NOT NULL,
    closing_rate double precision DEFAULT 0 NOT NULL,
    lost_requests_count integer DEFAULT 0 NOT NULL,
    withdrawn_requests_count integer DEFAULT 0 NOT NULL,
    broker_id character varying(21) NOT NULL
);


--
-- Name: conversation_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_embeddings (
    id integer NOT NULL,
    phone_number character varying(50) NOT NULL,
    message_type character varying(20) NOT NULL,
    message_text text NOT NULL,
    embedding public.vector(1024),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: conversation_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversation_embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversation_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversation_embeddings_id_seq OWNED BY public.conversation_embeddings.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    actor_type character varying(20) NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    context_type character varying(20) DEFAULT 'customer'::character varying NOT NULL,
    conversation_id character varying(21) NOT NULL,
    related_request_id character varying(21),
    actor_id character varying(21) NOT NULL
);


--
-- Name: customer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_sessions (
    session_id integer NOT NULL,
    phone_number character varying(50) NOT NULL,
    extracted_requirements jsonb DEFAULT '{}'::jsonb,
    last_intent character varying(50),
    is_complete boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    confirmed boolean DEFAULT false,
    awaiting_confirmation boolean DEFAULT false,
    confirmation_attempt integer DEFAULT 0
);


--
-- Name: customer_sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_sessions_session_id_seq OWNED BY public.customer_sessions.session_id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    name character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_id character varying(21) NOT NULL
);


--
-- Name: interview_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_responses (
    phase integer NOT NULL,
    question_key character varying(50),
    question_text text,
    response_text text,
    score double precision,
    evaluation_notes text,
    red_flags_detected jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    response_id character varying(21) NOT NULL,
    session_id character varying(21) NOT NULL
);


--
-- Name: interview_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_sessions (
    current_phase integer DEFAULT 1 NOT NULL,
    phase_question_index integer DEFAULT 0 NOT NULL,
    is_complete boolean DEFAULT false NOT NULL,
    phase_1_score double precision DEFAULT 0 NOT NULL,
    phase_2_score double precision DEFAULT 0 NOT NULL,
    phase_3_score double precision DEFAULT 0 NOT NULL,
    phase_4_score double precision DEFAULT 0 NOT NULL,
    phase_5_score double precision DEFAULT 0 NOT NULL,
    phase_6_score double precision DEFAULT 0 NOT NULL,
    red_flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_score double precision,
    final_result character varying(20),
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    conversation_context jsonb DEFAULT '[]'::jsonb NOT NULL,
    session_id character varying(21) NOT NULL,
    application_id character varying(21) NOT NULL
);


--
-- Name: payment_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_records (
    paid_amount double precision NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_id character varying(21) NOT NULL,
    reservation_id character varying(21) NOT NULL,
    recorded_by_broker_id character varying(21)
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url character varying(500),
    name_ar character varying(255),
    project_id character varying(21) NOT NULL,
    area_id character varying(21) NOT NULL
);


--
-- Name: projects_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects_embeddings (
    project_id integer NOT NULL,
    name character varying(255) NOT NULL,
    area_id integer,
    embedding public.vector(1024),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    embedding_en public.vector(1024),
    embedding_ar public.vector(1024)
);


--
-- Name: TABLE projects_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.projects_embeddings IS 'Pre-computed embeddings for projects for fast semantic search';


--
-- Name: request_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_status_history (
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    changed_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    id character varying(21) NOT NULL,
    request_id character varying(21) NOT NULL,
    from_broker_id character varying(21),
    to_broker_id character varying(21)
);


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    unit_type character varying(50),
    budget_min double precision,
    budget_max double precision,
    size_min double precision,
    size_max double precision,
    bedrooms integer,
    bathrooms integer,
    request_id character varying(21) NOT NULL,
    customer_id character varying(21) NOT NULL,
    assigned_broker_id character varying(21),
    area_id character varying(21) NOT NULL
);


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    total_unit_price double precision NOT NULL,
    customer_pay_amount double precision NOT NULL,
    broker_commission_amount double precision NOT NULL,
    reservation_status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    reservation_id character varying(21) NOT NULL,
    request_id character varying(21) NOT NULL,
    unit_id character varying(21) NOT NULL,
    broker_id character varying(21)
);


--
-- Name: unit_types_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_types_embeddings (
    unit_type_id integer NOT NULL,
    name character varying(100) NOT NULL,
    name_ar character varying(100),
    embedding public.vector(1024),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    embedding_en public.vector(1024),
    embedding_ar public.vector(1024)
);


--
-- Name: TABLE unit_types_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unit_types_embeddings IS 'Pre-computed embeddings for unit types for fast semantic search';


--
-- Name: unit_types_embeddings_unit_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_types_embeddings_unit_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_types_embeddings_unit_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_types_embeddings_unit_type_id_seq OWNED BY public.unit_types_embeddings.unit_type_id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    unit_type character varying(50) NOT NULL,
    size double precision NOT NULL,
    price double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    code character varying(100) NOT NULL,
    unit_name character varying(50),
    building character varying(50),
    floor character varying(20),
    garden_size double precision DEFAULT 0 NOT NULL,
    roof_size double precision DEFAULT 0 NOT NULL,
    down_payment_10_percent double precision,
    installment_4_years double precision,
    installment_5_years double precision,
    status character varying DEFAULT 'available'::character varying NOT NULL,
    image_url character varying(500),
    description text,
    unit_id character varying(21) NOT NULL,
    project_id character varying(21) NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    name character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    email character varying(255),
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    password_hash character varying(255),
    image_url character varying(500),
    user_id character varying(21) NOT NULL
);


--
-- Name: broker_chatbot_sessions session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_chatbot_sessions ALTER COLUMN session_id SET DEFAULT nextval('public.broker_chatbot_sessions_session_id_seq'::regclass);


--
-- Name: conversation_embeddings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings ALTER COLUMN id SET DEFAULT nextval('public.conversation_embeddings_id_seq'::regclass);


--
-- Name: customer_sessions session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions ALTER COLUMN session_id SET DEFAULT nextval('public.customer_sessions_session_id_seq'::regclass);


--
-- Name: unit_types_embeddings unit_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types_embeddings ALTER COLUMN unit_type_id SET DEFAULT nextval('public.unit_types_embeddings_unit_type_id_seq'::regclass);


--
-- Name: payment_records PK_aa71f09c09cd8aceae8702d842b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT "PK_aa71f09c09cd8aceae8702d842b" PRIMARY KEY (payment_id);


--
-- Name: areas_embeddings areas_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas_embeddings
    ADD CONSTRAINT areas_embeddings_pkey PRIMARY KEY (area_id);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (area_id);


--
-- Name: broker_applications broker_applications_applicant_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_applications
    ADD CONSTRAINT broker_applications_applicant_phone_key UNIQUE (applicant_phone);


--
-- Name: broker_applications broker_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_applications
    ADD CONSTRAINT broker_applications_pkey PRIMARY KEY (application_id);


--
-- Name: broker_areas broker_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_areas
    ADD CONSTRAINT broker_areas_pkey PRIMARY KEY (broker_id, area_id);


--
-- Name: broker_chatbot_sessions broker_chatbot_sessions_broker_id_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_chatbot_sessions
    ADD CONSTRAINT broker_chatbot_sessions_broker_id_request_id_key UNIQUE (broker_id, request_id);


--
-- Name: broker_chatbot_sessions broker_chatbot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_chatbot_sessions
    ADD CONSTRAINT broker_chatbot_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: brokers brokers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brokers
    ADD CONSTRAINT brokers_pkey PRIMARY KEY (broker_id);


--
-- Name: conversation_embeddings conversation_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings
    ADD CONSTRAINT conversation_embeddings_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id);


--
-- Name: customer_sessions customer_sessions_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_phone_number_key UNIQUE (phone_number);


--
-- Name: customer_sessions customer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: interview_responses interview_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_responses
    ADD CONSTRAINT interview_responses_pkey PRIMARY KEY (response_id);


--
-- Name: interview_sessions interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: projects_embeddings projects_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects_embeddings
    ADD CONSTRAINT projects_embeddings_pkey PRIMARY KEY (project_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- Name: request_status_history request_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_status_history
    ADD CONSTRAINT request_status_history_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (request_id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (reservation_id);


--
-- Name: unit_types_embeddings unit_types_embeddings_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types_embeddings
    ADD CONSTRAINT unit_types_embeddings_name_unique UNIQUE (name);


--
-- Name: unit_types_embeddings unit_types_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types_embeddings
    ADD CONSTRAINT unit_types_embeddings_pkey PRIMARY KEY (unit_type_id);


--
-- Name: units units_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_code_key UNIQUE (code);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (unit_id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: areas_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX areas_embedding_idx ON public.areas_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='10');


--
-- Name: idx_areas_embeddings_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_areas_embeddings_name ON public.areas_embeddings USING btree (name);


--
-- Name: idx_broker_chatbot_sessions_broker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broker_chatbot_sessions_broker ON public.broker_chatbot_sessions USING btree (broker_id);


--
-- Name: idx_broker_chatbot_sessions_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broker_chatbot_sessions_request ON public.broker_chatbot_sessions USING btree (request_id);


--
-- Name: idx_conversation_embeddings_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_phone ON public.conversation_embeddings USING btree (phone_number);


--
-- Name: idx_conversation_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_vector ON public.conversation_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_customer_sessions_awaiting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_awaiting ON public.customer_sessions USING btree (awaiting_confirmation) WHERE (awaiting_confirmation = true);


--
-- Name: idx_customer_sessions_complete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_complete ON public.customer_sessions USING btree (is_complete);


--
-- Name: idx_customer_sessions_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_phone ON public.customer_sessions USING btree (phone_number);


--
-- Name: idx_projects_embeddings_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_embeddings_area_id ON public.projects_embeddings USING btree (area_id);


--
-- Name: idx_projects_embeddings_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_embeddings_name ON public.projects_embeddings USING btree (name);


--
-- Name: idx_unit_types_embeddings_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unit_types_embeddings_name ON public.unit_types_embeddings USING btree (name);


--
-- Name: projects_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_embedding_idx ON public.projects_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='10');


--
-- Name: unit_types_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unit_types_embedding_idx ON public.unit_types_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='10');


--
-- Name: broker_chatbot_sessions broker_session_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER broker_session_update_trigger BEFORE UPDATE ON public.broker_chatbot_sessions FOR EACH ROW EXECUTE FUNCTION public.update_broker_session_timestamp();


--
-- Name: areas_embeddings trigger_areas_embeddings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_areas_embeddings_updated_at BEFORE UPDATE ON public.areas_embeddings FOR EACH ROW EXECUTE FUNCTION public.update_embedding_timestamp();


--
-- Name: projects_embeddings trigger_projects_embeddings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_projects_embeddings_updated_at BEFORE UPDATE ON public.projects_embeddings FOR EACH ROW EXECUTE FUNCTION public.update_embedding_timestamp();


--
-- Name: reservations FK_1547c49df2bcc237f0fb5a594f7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT "FK_1547c49df2bcc237f0fb5a594f7" FOREIGN KEY (unit_id) REFERENCES public.units(unit_id);


--
-- Name: broker_areas FK_18414219d10f94678acd6f22e49; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_areas
    ADD CONSTRAINT "FK_18414219d10f94678acd6f22e49" FOREIGN KEY (broker_id) REFERENCES public.brokers(broker_id) ON DELETE CASCADE;


--
-- Name: requests FK_1eb85fee89304c98ff429ea6123; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT "FK_1eb85fee89304c98ff429ea6123" FOREIGN KEY (assigned_broker_id) REFERENCES public.brokers(broker_id) ON DELETE SET NULL;


--
-- Name: requests FK_210052a4b94dfd2394b07ebde1d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT "FK_210052a4b94dfd2394b07ebde1d" FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: brokers FK_25af27bfabaf628ce6ab029fbb7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brokers
    ADD CONSTRAINT "FK_25af27bfabaf628ce6ab029fbb7" FOREIGN KEY (broker_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: broker_applications FK_4875d85b64caad9375bb3659166; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_applications
    ADD CONSTRAINT "FK_4875d85b64caad9375bb3659166" FOREIGN KEY (converted_user_id) REFERENCES public.users(user_id);


--
-- Name: reservations FK_7a7b9e04785f3db51ad32b546a6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT "FK_7a7b9e04785f3db51ad32b546a6" FOREIGN KEY (broker_id) REFERENCES public.brokers(broker_id) ON DELETE SET NULL;


--
-- Name: interview_responses FK_7e72e2e43462ef593c4ac3fa9c4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_responses
    ADD CONSTRAINT "FK_7e72e2e43462ef593c4ac3fa9c4" FOREIGN KEY (session_id) REFERENCES public.interview_sessions(session_id);


--
-- Name: projects FK_81f0274aec36885e20d9ec9fe8b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_81f0274aec36885e20d9ec9fe8b" FOREIGN KEY (area_id) REFERENCES public.areas(area_id);


--
-- Name: reservations FK_86424e188c8c2103cdf7cccce9a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT "FK_86424e188c8c2103cdf7cccce9a" FOREIGN KEY (request_id) REFERENCES public.requests(request_id);


--
-- Name: payment_records FK_949211bc706ebf373516747b210; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT "FK_949211bc706ebf373516747b210" FOREIGN KEY (reservation_id) REFERENCES public.reservations(reservation_id);


--
-- Name: broker_areas FK_ac663b96813cef06f06e9f52346; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_areas
    ADD CONSTRAINT "FK_ac663b96813cef06f06e9f52346" FOREIGN KEY (area_id) REFERENCES public.areas(area_id);


--
-- Name: request_status_history FK_b20108dc65faaad4d2138da6028; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_status_history
    ADD CONSTRAINT "FK_b20108dc65faaad4d2138da6028" FOREIGN KEY (request_id) REFERENCES public.requests(request_id);


--
-- Name: payment_records FK_bef391a186c1ce0e3efbe8c230c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_records
    ADD CONSTRAINT "FK_bef391a186c1ce0e3efbe8c230c" FOREIGN KEY (recorded_by_broker_id) REFERENCES public.brokers(broker_id) ON DELETE SET NULL;


--
-- Name: requests FK_d599b1a59b40ffb921393d83b81; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT "FK_d599b1a59b40ffb921393d83b81" FOREIGN KEY (area_id) REFERENCES public.areas(area_id);


--
-- Name: units FK_e1d1963ddfadd3542dd5c52ee4f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "FK_e1d1963ddfadd3542dd5c52ee4f" FOREIGN KEY (project_id) REFERENCES public.projects(project_id);


--
-- Name: interview_sessions FK_e9f59415dd7f4842a92f8fd38ca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT "FK_e9f59415dd7f4842a92f8fd38ca" FOREIGN KEY (application_id) REFERENCES public.broker_applications(application_id);


--
-- Name: conversations FK_f899cbf3522526d22f378258e66; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "FK_f899cbf3522526d22f378258e66" FOREIGN KEY (related_request_id) REFERENCES public.requests(request_id);


--
-- Name: broker_chatbot_sessions broker_chatbot_sessions_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_chatbot_sessions
    ADD CONSTRAINT broker_chatbot_sessions_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.brokers(broker_id) ON DELETE CASCADE;


--
-- Name: broker_chatbot_sessions broker_chatbot_sessions_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broker_chatbot_sessions
    ADD CONSTRAINT broker_chatbot_sessions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(request_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

