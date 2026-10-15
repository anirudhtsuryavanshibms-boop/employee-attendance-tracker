import java.util.Scanner;

class EmployeeAttendance {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter employee name: ");
        String name = sc.nextLine();

        char[] attendance = new char[5];
        int presentDays = 0;

        System.out.println("Enter attendance for exactly 5 days (P/A):");

        for (int i = 0; i < 5; i++) {
            System.out.print("Day " + (i + 1) + ": ");
            String input = sc.next().toUpperCase();

            if (input.length() != 1 ||
                (input.charAt(0) != 'P' && input.charAt(0) != 'A')) {
                System.out.println("Invalid input! Enter only P or A.");
                i--;
                continue;
            }

            attendance[i] = input.charAt(0);

            if (attendance[i] == 'P') {
                presentDays++;
            }
        }

        double percentage = (presentDays / 5.0) * 100;

        System.out.println("\nEmployee Name: " + name);
        System.out.println("Present Days: " + presentDays);
        System.out.printf("Attendance: %.2f%%%n", percentage);

        if (percentage >= 75) {
            System.out.println("Status: Eligible");
        } else {
            System.out.println("Status: Not Eligible");
        }

        sc.close();
    }
}
