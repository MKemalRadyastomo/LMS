# Search System Integration Guide

## Overview

This guide documents the complete integration between the frontend search system and the backend APIs. The integration includes response transformation, caching, and comprehensive error handling.

## Architecture

```
Frontend (React/TypeScript)
├── Search Components
├── Search API Client (searchApi.ts)
├── Search Store (Zustand)
└── Search Types (search.types.ts)
    │
    ▼ HTTP Requests
Backend (Node.js/Express)
├── Search Routes (/api/search/*)
├── Search Controller (transformed responses)
├── Search Service (business logic)
├── Search Model (database queries)
└── Search Cache (performance optimization)
```

## API Endpoints

### 1. Main Search
**Endpoint**: `GET /api/search`

**Frontend Parameters**:
```typescript
{
  q: string;                    // Search query
  contentType?: string[];       // ['course', 'material', 'assignment']
  courseId?: string;
  authorId?: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'title' | 'author';
  sortOrder?: 'asc' | 'desc';
}
```

**Response Format**:
```typescript
{
  success: true;
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  searchTime: number;
  facets?: {
    contentTypes: { type: string; count: number }[];
    courses: { id: string; name: string; count: number }[];
    authors: { id: string; name: string; count: number }[];
  };
}
```

### 2. Search Suggestions
**Endpoint**: `GET /api/search/suggestions`

**Parameters**: `?q={partialQuery}&limit={limit}`

**Response**:
```typescript
{
  success: true;
  suggestions: SearchSuggestion[];
}
```

### 3. Popular Searches
**Endpoint**: `GET /api/search/popular`

**Parameters**: `?timeframe={day|week|month}&limit={limit}`

**Response**:
```typescript
{
  success: true;
  searches: string[];
  timeframe: string;
}
```

### 4. Search Analytics
**Endpoint**: `GET /api/search/analytics` (Admin/Guru only)

**Response**:
```typescript
{
  success: true;
  totalSearches: number;
  averageResponseTime: number;
  mostSearchedTerms: { term: string; count: number }[];
}
```

### 5. Advanced Search
**Endpoint**: `POST /api/search/advanced`

**Body**:
```typescript
{
  query: string;
  contentTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
  includeAnalytics?: boolean;
  includeFacets?: boolean;
  includeHighlights?: boolean;
}
```

### 6. Saved Searches
- `POST /api/search/saved` - Save search
- `GET /api/search/saved` - Get saved searches  
- `PATCH /api/search/saved/:id` - Update saved search
- `DELETE /api/search/saved/:id` - Delete saved search

### 7. Analytics Tracking
**Endpoint**: `POST /api/search/analytics`

**Body**:
```typescript
{
  query: string;
  resultCount: number;
  responseTime: number;
}
```

## Response Transformation

The `SearchTransformer` utility class handles mapping between backend and frontend formats:

### Backend Result → Frontend SearchResult

```javascript
// Backend format (from database)
{
  id: 123,
  type: 'course',
  title: 'Introduction to React',
  description: 'Learn React basics...',
  rank: 0.8,
  created_at: '2023-01-01T00:00:00Z',
  course_id: 456,
  teacher_id: 789
}

// Frontend format (after transformation)
{
  id: "123",
  title: "Introduction to React",
  content: "Learn React basics...",
  type: "course",
  score: 0.8,
  url: "/courses/123",
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-01T00:00:00Z",
  metadata: {
    courseId: "456",
    authorId: "789",
    // ... additional metadata
  },
  highlight: {
    title: "Introduction to React",
    content: "Learn React basics..."
  }
}
```

## Performance Optimization

### Caching Strategy

1. **In-Memory Caching**: 5-minute TTL for search results
2. **Suggestions Caching**: 2-minute TTL for autocomplete
3. **Popular Searches**: 30-minute TTL
4. **Analytics**: 15-minute TTL

### Cache Configuration

```javascript
{
  defaultTTL: 5 * 60 * 1000,        // 5 minutes
  maxCacheSize: 1000,               // Max 1000 entries
  cleanupInterval: 10 * 60 * 1000,  // Cleanup every 10 minutes
}
```

### Performance Targets

- **Search Response Time**: < 200ms (cached: < 50ms)
- **Suggestions Response Time**: < 100ms
- **Cache Hit Rate**: > 60%

## Error Handling

### Frontend Error Types

1. **Network Errors**: Connection issues, timeouts
2. **Validation Errors**: Invalid query parameters
3. **Permission Errors**: Insufficient access rights
4. **Server Errors**: Internal server errors

### Error Response Format

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Graceful Degradation

- **Search Failures**: Return empty results with error message
- **Suggestions Failures**: Return empty array silently
- **Analytics Failures**: Return default values
- **Cache Failures**: Bypass cache, execute query directly

## Security Considerations

### Role-Based Access Control

1. **Public Content**: Available to all authenticated users
2. **Private Courses**: Only accessible to enrolled users and teachers
3. **Admin Analytics**: Restricted to admin and guru roles

### Query Sanitization

- Remove dangerous characters: `<>"'`
- Limit query length: Max 100 characters
- Normalize whitespace
- Prevent SQL injection through parameterized queries

## Testing Strategy

### Unit Tests

1. **SearchTransformer**: Test all transformation methods
2. **SearchService**: Test business logic and error handling
3. **SearchController**: Test request/response handling
4. **SearchCache**: Test caching logic and eviction

### Integration Tests

1. **API Endpoints**: Test all search endpoints with various parameters
2. **Role-Based Access**: Verify permission enforcement
3. **Performance**: Test response times and caching effectiveness
4. **Error Scenarios**: Test error handling and recovery

### Test Data Setup

```sql
-- Insert test courses
INSERT INTO courses (name, description, teacher_id, privacy) VALUES
('React Fundamentals', 'Learn React from scratch', 1, 'public'),
('Advanced Node.js', 'Master Node.js concepts', 2, 'private');

-- Insert test materials
INSERT INTO materials (title, description, course_id, content) VALUES
('Introduction to Components', 'Understanding React components', 1, 'Component content...'),
('Express Middleware', 'Building Express middleware', 2, 'Middleware content...');

-- Insert test assignments
INSERT INTO assignments (title, description, course_id, type, status) VALUES
('React Project', 'Build a React application', 1, 'project', 'active'),
('Node.js API', 'Create a RESTful API', 2, 'assignment', 'active');
```

## Monitoring and Logging

### Search Analytics

- Track search queries and result counts
- Monitor response times and error rates
- Identify popular search terms
- Analyze user search patterns

### Performance Metrics

- Cache hit/miss ratios
- Average search response time
- Database query performance
- Memory usage of cache

### Logging

```javascript
// Search performed
logger.info('Search executed', {
  userId: user.id,
  query: sanitizedQuery,
  resultCount: results.length,
  responseTime: Date.now() - startTime
});

// Cache operations
logger.debug('Cache hit', { key: cacheKey });
logger.debug('Cache miss', { key: cacheKey });
```

## Deployment Checklist

### Backend Deployment

- [ ] Deploy SearchTransformer utility
- [ ] Update SearchController with transformations
- [ ] Deploy SearchCache middleware
- [ ] Update search routes with caching
- [ ] Verify database indexes for search performance
- [ ] Test all API endpoints

### Frontend Integration

- [ ] Verify searchApi.ts calls correct endpoints
- [ ] Test response format compatibility
- [ ] Validate error handling
- [ ] Test caching behavior
- [ ] Verify TypeScript type compatibility

### Performance Validation

- [ ] Measure search response times
- [ ] Verify cache hit rates
- [ ] Test with realistic data volumes
- [ ] Load test search endpoints
- [ ] Monitor memory usage

## Troubleshooting

### Common Issues

1. **Type Mismatches**: Ensure frontend types match transformed responses
2. **Cache Issues**: Clear cache if stale data persists
3. **Permission Errors**: Verify user roles and course enrollments
4. **Performance Issues**: Check database indexes and query optimization

### Debug Tools

```javascript
// Enable search debugging
process.env.SEARCH_DEBUG = 'true';

// Cache statistics
const stats = searchCache.getStats();
console.log('Cache stats:', stats);

// Clear cache manually
searchCache.clear();
```

## Future Enhancements

### Planned Features

1. **Full-Text Search Highlighting**: Highlight search terms in results
2. **Search History**: Store and manage user search history
3. **Advanced Filters**: Date range, file type, and tag filtering
4. **Search Templates**: Save and reuse complex search queries
5. **Elasticsearch Integration**: Replace PostgreSQL search with Elasticsearch

### Performance Improvements

1. **Redis Caching**: Replace in-memory cache with Redis
2. **Database Sharding**: Implement search result pagination
3. **CDN Integration**: Cache static search results
4. **Search Indexing**: Optimize database indexes for search performance

## Support

For issues or questions regarding the search integration:

1. Check the logs for error details
2. Verify API endpoint responses with Postman
3. Test with minimal search queries
4. Check user permissions and role assignments
5. Review database query performance

This integration guide provides a complete overview of the search system integration between frontend and backend components.