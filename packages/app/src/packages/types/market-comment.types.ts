import type { ProviderApiId } from "@/packages/providers/provider-config.ts";

export const MARKET_COMMENT_MAX_LENGTH = 2000;

export type MarketCommentAuthor = {
	id: string;
	username: string | null;
};

export type MarketComment = {
	id: string;
	provider: ProviderApiId;
	market_id: string;
	author: MarketCommentAuthor;
	body: string;
	created_at: string;
	updated_at: string;
};

export type MarketCommentsPage = {
	comments: MarketComment[];
	next_cursor: string | null;
};

export type CreateMarketCommentRequest = {
	body: string;
};

export type MarketCommentStreamEvent = {
	event_type: "market_comment.created";
	comment: MarketComment;
};
