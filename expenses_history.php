<?php
session_start();
include '../db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit;
}

$user_id = intval($_SESSION['user_id']);

// Determine which date column exists
$dateColumn = 'expense_date';
$result = $conn->query("SHOW COLUMNS FROM expenses LIKE 'expense_date'");
if ($result->num_rows === 0) {
    $result = $conn->query("SHOW COLUMNS FROM expenses LIKE 'created_at'");
    if ($result->num_rows > 0) $dateColumn = 'created_at';
    else {
        $result = $conn->query("SHOW COLUMNS FROM expenses LIKE 'date'");
        if ($result->num_rows > 0) $dateColumn = 'date';
    }
}

// Get selected month/year or default to current month
$month = $_GET['month'] ?? date('m');
$year  = $_GET['year']  ?? date('Y');

// Fetch distinct months/years for archive dropdown
$month_list = [];
$archive_sql = "SELECT DISTINCT YEAR($dateColumn) AS y, MONTH($dateColumn) AS m FROM expenses WHERE user_id=? ORDER BY y DESC, m DESC";
$stmt = $conn->prepare($archive_sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $month_list[] = ['year'=>$row['y'], 'month'=>$row['m']];
}
$stmt->close();

// Fetch expenses for the selected month
$sql = "
    SELECT id, expense_name AS name, category, amount, $dateColumn AS expense_date, notes
    FROM expenses
    WHERE user_id=? AND MONTH($dateColumn)=? AND YEAR($dateColumn)=?
    ORDER BY $dateColumn DESC
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iii", $user_id, $month, $year);
$stmt->execute();
$result = $stmt->get_result();
$expenses = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Calculate total expenses for the month
$total_expenses = array_sum(array_column($expenses, 'amount'));

$conn->close();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Expenses History - Monthly Archive</title>
<style>
body { font-family:"Segoe UI",Arial,sans-serif; background:#f5f7fa; color:#333; margin:0; padding:0; }
header { background:#ff7f50; color:#fff; text-align:center; padding:15px; font-size:1.3rem; font-weight:bold; }
.container { max-width:1000px; margin:20px auto; padding:10px; }
.back-button { display:inline-block; background:#ff7f50; color:white; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:600; margin-bottom:10px; }
.back-button:hover { background:#e36f41; }
.filter { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:15px; }
.filter select { padding:8px; border-radius:5px; border:1px solid #ccc; }
.filter button { padding:8px 14px; background:#ff7f50; border:none; color:white; border-radius:5px; cursor:pointer; font-weight:600; }
.filter button:hover { background:#e36f41; }
.table-container { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow-x:auto; }
table { width:100%; border-collapse:collapse; min-width:700px; }
th, td { padding:12px; border-bottom:1px solid #eee; text-align:left; white-space:nowrap; font-size:0.95rem; }
th { background:#ff7f50; color:white; font-weight:600; position:sticky; top:0; }
tr:hover { background:#f9fafb; }
.total-summary { padding:10px; background:#ecfdf5; color:#065f46; font-weight:bold; border-radius:5px; margin-bottom:15px; text-align:right; font-size:1.1rem; }
.no-data { text-align:center; padding:25px; color:#777; font-style:italic; }
@media(max-width:768px){ .filter { flex-direction:column; } table{ min-width:600px; } .back-button{ width:100%; text-align:center; } }
@media(max-width:480px){ th,td{ padding:8px; font-size:0.8rem; } }
</style>
</head>
<body>
<header> Expenses History - Monthly Archive</header>
<div class="container">

<a href="expenses.php" class="back-button">← Back to Expenses</a>

<form class="filter" method="GET" action="expenses_history.php">
    <label>Month: 
        <select name="month">
            <?php 
            $currentMonth = date('m');
            $currentYear  = date('Y');
            for($m=1;$m<=12;$m++): 
                $selected = ($m==$month) ? "selected" : "";
                $monthName = date("F", mktime(0,0,0,$m,10));
                $disabled = ($year==$currentYear && $m>$currentMonth) ? "disabled" : "";
            ?>
                <option value="<?= $m ?>" <?= $selected ?> <?= $disabled ?>><?= $monthName ?></option>
            <?php endfor; ?>
        </select>
    </label>
    <label>Year: 
        <select name="year">
            <?php 
            $years = array_unique(array_column($month_list,'year'));
            foreach($years as $y): 
                $selected = ($y==$year) ? "selected" : "";
                $disabled = ($y>$currentYear) ? "disabled" : "";
            ?>
                <option value="<?= $y ?>" <?= $selected ?> <?= $disabled ?>><?= $y ?></option>
            <?php endforeach; ?>
        </select>
    </label>
    <button type="submit">Show</button>
</form>

<!-- Total expenses for this month -->
<div class="total-summary">
    Total Expenses for <?= date("F Y", mktime(0,0,0,$month,10,$year)) ?>: KES <?= number_format($total_expenses,2) ?>
</div>

<div class="table-container">
<table>
    <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Category</th>
        <th>Amount (KES)</th>
        <th>Date</th>
        <th>Notes</th>
    </tr>
    <?php if(count($expenses)>0): ?>
        <?php foreach($expenses as $exp): ?>
            <tr>
                <td><?= $exp['id'] ?></td>
                <td><?= htmlspecialchars($exp['name']) ?></td>
                <td><?= htmlspecialchars($exp['category']) ?></td>
                <td><?= number_format($exp['amount'],2) ?></td>
                <td><?= date("Y-m-d H:i", strtotime($exp['expense_date'])) ?></td>
                <td><?= htmlspecialchars($exp['notes']) ?></td>
            </tr>
        <?php endforeach; ?>
    <?php else: ?>
        <tr><td colspan="6" class="no-data">No expenses found for this month.</td></tr>
    <?php endif; ?>
</table>
</div>

</div>
</body>
</html>