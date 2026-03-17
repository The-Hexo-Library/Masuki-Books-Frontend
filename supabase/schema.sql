-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.addresses (
  address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name character varying NOT NULL,
  profession character varying,
  address_line1 character varying NOT NULL,
  address_line2 character varying,
  city character varying NOT NULL,
  state character varying,
  zip_code character varying NOT NULL,
  country character varying NOT NULL,
  phone_number character varying NOT NULL,
  email character varying NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT addresses_pkey PRIMARY KEY (address_id),
  CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.admin_users (
  admin_id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  role character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (admin_id)
);
CREATE TABLE public.audit_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_type character varying NOT NULL,
  actor_id uuid,
  action character varying NOT NULL,
  entity_type character varying,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id)
);
CREATE TABLE public.bookmarks (
  bookmark_id uuid NOT NULL,
  color character varying,
  created_at timestamp without time zone NOT NULL,
  note text,
  page_number integer NOT NULL,
  title character varying,
  updated_at timestamp without time zone NOT NULL,
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT bookmarks_pkey PRIMARY KEY (bookmark_id),
  CONSTRAINT fkeaja9ximq7frh29a3yvhmim1b FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT fkdbsho2e05w5r13fkjqfjmge5f FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.cart_items (
  cart_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (cart_item_id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(cart_id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.carts (
  cart_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  guest_token character varying UNIQUE,
  status character varying NOT NULL DEFAULT 'active'::character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (cart_id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.categories (
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_category_id uuid,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  image_url character varying,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (category_id),
  CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.discount_codes (
  discount_id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  type character varying NOT NULL,
  value numeric NOT NULL,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp without time zone,
  expires_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT discount_codes_pkey PRIMARY KEY (discount_id)
);
CREATE TABLE public.download_tokens (
  token_id uuid NOT NULL,
  created_at timestamp without time zone NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  ip_address character varying,
  token character varying NOT NULL UNIQUE,
  used boolean NOT NULL,
  used_at timestamp without time zone,
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT download_tokens_pkey PRIMARY KEY (token_id),
  CONSTRAINT fk7jw7ei3okpil89qg91d3dbhx8 FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT fkjohi5tfll4mhu5bm4hd8u7yhr FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.inventory (
  inventory_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  last_updated timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.inventory_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  change_qty integer NOT NULL,
  reason character varying NOT NULL,
  reference_id uuid,
  performed_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT inventory_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.admin_users(admin_id),
  CONSTRAINT inventory_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.notifications (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type character varying NOT NULL,
  channel character varying NOT NULL,
  recipient character varying NOT NULL,
  subject character varying,
  body text,
  status character varying NOT NULL DEFAULT 'queued'::character varying,
  sent_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.order_items (
  order_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid,
  product_title character varying NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.orders (
  order_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  guest_email character varying,
  order_number character varying NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  subtotal numeric NOT NULL,
  discount_id uuid,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  shipping_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  shipping_address_id uuid,
  billing_address_id uuid,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  order_type character varying,
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT orders_billing_address_id_fkey FOREIGN KEY (billing_address_id) REFERENCES public.addresses(address_id),
  CONSTRAINT orders_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discount_codes(discount_id),
  CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.addresses(address_id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.otp_verifications (
  otp_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient character varying NOT NULL,
  type character varying NOT NULL,
  otp_hash character varying NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  used_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT otp_verifications_pkey PRIMARY KEY (otp_id),
  CONSTRAINT otp_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.payments (
  payment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  payment_method character varying NOT NULL,
  gateway character varying NOT NULL,
  gateway_transaction_id character varying,
  gateway_payment_id character varying,
  amount numeric NOT NULL,
  currency character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  failure_reason text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.product_images (
  image_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  url character varying NOT NULL,
  alt_text character varying,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (image_id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.product_ui_translations (
  translation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  language_code character varying NOT NULL,
  title character varying,
  description text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_ui_translations_pkey PRIMARY KEY (translation_id),
  CONSTRAINT product_ui_translations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.products (
  product_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  sku character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  author character varying NOT NULL,
  publisher character varying,
  isbn character varying UNIQUE,
  description text,
  language character varying NOT NULL DEFAULT 'en'::character varying,
  format character varying NOT NULL,
  pages integer,
  publication_date date,
  price numeric NOT NULL,
  compare_at_price numeric,
  status character varying NOT NULL DEFAULT 'draft'::character varying,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  content_type character varying,
  downloadable boolean,
  file_format character varying,
  file_key character varying,
  file_size_bytes bigint,
  max_downloads integer,
  preview_pages integer,
  total_pages integer,
  CONSTRAINT products_pkey PRIMARY KEY (product_id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
  CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(admin_id)
);
CREATE TABLE public.reading_progress (
  progress_id uuid NOT NULL,
  created_at timestamp without time zone NOT NULL,
  current_page integer,
  last_read_at timestamp without time zone,
  percentage numeric,
  reading_time_seconds bigint,
  total_pages integer,
  updated_at timestamp without time zone NOT NULL,
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT reading_progress_pkey PRIMARY KEY (progress_id),
  CONSTRAINT fk18kamohoarg4k4ke2gyjnjhpx FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT fkm29heqt0ff3ofdc6hfj2pquby FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.refunds (
  refund_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  order_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text,
  status character varying NOT NULL DEFAULT 'requested'::character varying,
  gateway_refund_id character varying,
  processed_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT refunds_pkey PRIMARY KEY (refund_id),
  CONSTRAINT refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(payment_id),
  CONSTRAINT refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.admin_users(admin_id)
);
CREATE TABLE public.reviews (
  review_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  rating smallint NOT NULL,
  title character varying,
  body text,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  moderated_by uuid,
  moderated_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (review_id),
  CONSTRAINT reviews_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.admin_users(admin_id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.shipments (
  shipment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  tracking_number character varying,
  carrier character varying,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  estimated_delivery date,
  delivered_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT shipments_pkey PRIMARY KEY (shipment_id),
  CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.ui_translations (
  translation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  language_code character varying NOT NULL,
  key character varying NOT NULL,
  value text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT ui_translations_pkey PRIMARY KEY (translation_id)
);
CREATE TABLE public.user_auth_providers (
  auth_provider_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider character varying NOT NULL,
  provider_user_id character varying NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_auth_providers_pkey PRIMARY KEY (auth_provider_id),
  CONSTRAINT user_auth_providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.user_library (
  user_library_id uuid NOT NULL,
  access_type character varying NOT NULL,
  acquired_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone NOT NULL,
  expires_at timestamp without time zone,
  status character varying NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  order_id uuid,
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT user_library_pkey PRIMARY KEY (user_library_id),
  CONSTRAINT fk1b2yp6pb3j74xhgw8njeg37jf FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT fke6swjelwrqjgqmbe53bmqwnvi FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT fkssg4makcjh7i3v46n7qi1xr3h FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.user_sessions (
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash character varying NOT NULL,
  ip_address character varying,
  user_agent text,
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.users (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying UNIQUE,
  phone_number character varying UNIQUE,
  password_hash character varying,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  profession character varying,
  preferred_language character varying NOT NULL DEFAULT 'en'::character varying,
  pii_consent boolean NOT NULL DEFAULT false,
  pii_consent_date timestamp without time zone,
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  status character varying NOT NULL DEFAULT 'active'::character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);