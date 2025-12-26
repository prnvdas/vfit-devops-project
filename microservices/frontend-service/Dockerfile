# Use Nginx Alpine (very small - only 23MB!)
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/nginx.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy HTML files
COPY app/ /usr/share/nginx/html/

# Add health check using wget (included in alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Expose port 3000
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
