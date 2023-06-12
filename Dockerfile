FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 7777
CMD ["nginx", "-g", "daemon off;"]

