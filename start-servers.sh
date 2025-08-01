#!/bin/bash

# LMS Servers Startup Script
# This script starts both frontend and backend servers in the background

set -e

BACKEND_DIR="/Users/khalid/Documents/Projects/lms-backend"
FRONTEND_DIR="/Users/khalid/Documents/Projects/lms-frontend-v2"
BACKEND_PID_FILE="$BACKEND_DIR/.backend.pid"
FRONTEND_PID_FILE="$FRONTEND_DIR/.frontend.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}       LMS Server Management${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "Process still running, force killing..."
                kill -9 $pid
            fi
        fi
        rm -f "$pid_file"
    fi
}

# Function to start backend server
start_backend() {
    print_status "Starting backend server (Port 3000)..."
    
    if check_port 3000; then
        print_warning "Port 3000 is already in use"
        if [ -f "$BACKEND_PID_FILE" ]; then
            print_status "Backend server appears to be already running"
            return 0
        else
            print_error "Another process is using port 3000"
            return 1
        fi
    fi
    
    cd "$BACKEND_DIR"
    
    # Start backend server in background
    npm start > backend.log 2>&1 &
    local backend_pid=$!
    
    # Save PID to file
    echo $backend_pid > "$BACKEND_PID_FILE"
    
    # Wait a moment and check if process is still running
    sleep 3
    if ps -p $backend_pid > /dev/null; then
        print_status "Backend server started successfully (PID: $backend_pid)"
        print_status "Backend logs: $BACKEND_DIR/backend.log"
        return 0
    else
        print_error "Backend server failed to start"
        rm -f "$BACKEND_PID_FILE"
        return 1
    fi
}

# Function to start frontend server
start_frontend() {
    print_status "Starting frontend server (Port 9876)..."
    
    if check_port 9876; then
        print_warning "Port 9876 is already in use"
        if [ -f "$FRONTEND_PID_FILE" ]; then
            print_status "Frontend server appears to be already running"
            return 0
        else
            print_error "Another process is using port 9876"
            return 1
        fi
    fi
    
    cd "$FRONTEND_DIR"
    
    # Start frontend server in background
    pnpm dev > frontend.log 2>&1 &
    local frontend_pid=$!
    
    # Save PID to file
    echo $frontend_pid > "$FRONTEND_PID_FILE"
    
    # Wait a moment and check if process is still running
    sleep 5
    if ps -p $frontend_pid > /dev/null; then
        print_status "Frontend server started successfully (PID: $frontend_pid)"
        print_status "Frontend logs: $FRONTEND_DIR/frontend.log"
        return 0
    else
        print_error "Frontend server failed to start"
        rm -f "$FRONTEND_PID_FILE"
        return 1
    fi
}

# Function to stop servers
stop_servers() {
    print_status "Stopping LMS servers..."
    
    kill_by_pid_file "$BACKEND_PID_FILE" "Backend Server"
    kill_by_pid_file "$FRONTEND_PID_FILE" "Frontend Server"
    
    # Also kill any remaining processes on the ports
    if check_port 3000; then
        print_status "Killing remaining processes on port 3000..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    
    if check_port 9876; then
        print_status "Killing remaining processes on port 9876..."
        lsof -ti:9876 | xargs kill -9 2>/dev/null || true
    fi
    
    print_status "All servers stopped"
}

# Function to show server status
show_status() {
    print_header
    echo
    
    print_status "Server Status Check:"
    echo
    
    if check_port 3000; then
        echo -e "  ${GREEN}✓${NC} Backend Server: ${GREEN}RUNNING${NC} on port 3000"
        if [ -f "$BACKEND_PID_FILE" ]; then
            local pid=$(cat "$BACKEND_PID_FILE")
            echo -e "    PID: $pid"
        fi
    else
        echo -e "  ${RED}✗${NC} Backend Server: ${RED}NOT RUNNING${NC}"
    fi
    
    if check_port 9876; then
        echo -e "  ${GREEN}✓${NC} Frontend Server: ${GREEN}RUNNING${NC} on port 9876"
        if [ -f "$FRONTEND_PID_FILE" ]; then
            local pid=$(cat "$FRONTEND_PID_FILE")
            echo -e "    PID: $pid"
        fi
    else
        echo -e "  ${RED}✗${NC} Frontend Server: ${RED}NOT RUNNING${NC}"
    fi
    
    echo
    print_status "Access URLs:"
    echo -e "  Backend API: ${BLUE}http://localhost:3000${NC}"
    echo -e "  Frontend App: ${BLUE}http://localhost:9876${NC}"
    echo -e "  WebSocket: ${BLUE}ws://localhost:3000/api/notifications/ws${NC}"
    echo
}

# Function to show logs
show_logs() {
    local service=$1
    case $service in
        "backend"|"be")
            if [ -f "$BACKEND_DIR/backend.log" ]; then
                tail -f "$BACKEND_DIR/backend.log"
            else
                print_error "Backend log file not found"
            fi
            ;;
        "frontend"|"fe")
            if [ -f "$FRONTEND_DIR/frontend.log" ]; then
                tail -f "$FRONTEND_DIR/frontend.log"
            else
                print_error "Frontend log file not found"
            fi
            ;;
        *)
            print_error "Invalid service. Use 'backend' or 'frontend'"
            ;;
    esac
}

# Main script logic
case "${1:-start}" in
    "start")
        print_header
        echo
        print_status "Starting LMS servers..."
        echo
        
        start_backend
        start_frontend
        
        echo
        show_status
        
        print_status "Both servers are now running in the background"
        print_status "Use '$0 stop' to stop all servers"
        print_status "Use '$0 status' to check server status"
        print_status "Use '$0 logs backend' or '$0 logs frontend' to view logs"
        ;;
        
    "stop")
        print_header
        stop_servers
        ;;
        
    "restart")
        print_header
        stop_servers
        sleep 2
        echo
        start_backend
        start_frontend
        echo
        show_status
        ;;
        
    "status")
        show_status
        ;;
        
    "logs")
        show_logs "$2"
        ;;
        
    "help"|"-h"|"--help")
        print_header
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  start     Start both servers (default)"
        echo "  stop      Stop both servers"
        echo "  restart   Restart both servers"
        echo "  status    Show server status"
        echo "  logs      Show logs (backend|frontend)"
        echo "  help      Show this help message"
        echo
        ;;
        
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac