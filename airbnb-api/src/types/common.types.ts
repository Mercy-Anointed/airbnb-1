export interface AuthUser {
    id: string,
    email: string,
    role: string
}

export interface IdParam {
    id: string
}

export interface BaseQueryParams {
    page?: string;
    limit: string;
    sortBy: string;
    orderBy: 'asc' | 'desc'
}