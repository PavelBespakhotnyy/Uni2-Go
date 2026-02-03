<?php 
require '../PHP/index.php';
/*$sqldb = "show tables";
$resultdb = $con->query($sqldb);

?>
<nav>
    <ul>
        <?php
        while ($rowdb = $resultdb->fetch_assoc()) {
            $tables = $rowdb['Tables_in_social_calendar'];
        ?>
        <li><a href="Uni2-Go/backend/admin/administrator.php?tables=<?php echo $tables;?>"><?php echo $tables;?></a></li>
        <?php
        }
        ?>
    </ul>

</nav>
*/?>
<?php
$sql = "SELECT * FROM `users`";
$result = $con->query($sql);
?>
<table>
    <thead>
            <tr>
                <th>id_users</th>
                <th>email</th>
                <th>password_hash</th>
                <th>first_name</th>
                <th>last_name</th>
                <th>phone</th>
                <th>date_of_birth</th>
                <th>crated_at</th>
                <th>updated_at</th>
                <th>is_active</th>
                <th>acciones</th>
            </tr>
    </thead>
    <tbody>
<?php
while ($row = $result->fetch_assoc()) {
    if ($row['is_active'] == 1) {
        $activo = "activo";
    } else {
        $activo = "desconectado";
    }

    ?>
        
            <tr>
                <td><?php echo $row['user_id'];?></td>
                <td><?php echo $row['email'];?></td>
                <td><?php echo $row['password_hash'];?></td>
                <td><?php echo $row['first_name'];?></td>
                <td><?php echo $row['last_name'];?></td>
                <td><?php echo $row['phone'];?></td>
                <td><?php echo $row['date_of_birth'];?></td>
                <td><?php echo $row['created_at'];?></td>
                <td><?php echo $row['updated_at'];?></td>
                <td><?php echo $activo;?></td>
                <td>
                    <a href="">Actualizar</a>
                    <a href="">Eliminar</a>
                </td>
            </tr>
    <?php
}

?>
    </tbody>
</table>