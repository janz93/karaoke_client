FROM ruby:2.7.1
RUN apt-get update && \
    apt-get install -y nodejs npm 
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY package.json /myapp/package.json
COPY package-lock.json /myapp/package-lock.json
RUN npm install
COPY . /myapp

# Add a script to be executed every time the container starts.
EXPOSE 9292